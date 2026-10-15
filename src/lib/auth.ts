import { supabase } from './supabase';
import type { Profile } from '../types';

/**
 * Normalizes an Indian phone number to E.164 format (+91XXXXXXXXXX)
 */
export function formatIndianPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }
  if (phone.startsWith('+')) {
    return phone.trim();
  }
  return `+91${cleaned.slice(-10)}`;
}

/**
 * Triggers Supabase Phone Number OTP SMS
 */
export async function sendPhoneOtp(rawPhone: string) {
  const phone = formatIndianPhoneNumber(rawPhone);
  const { data, error } = await supabase.auth.signInWithOtp({
    phone,
  });

  if (error) {
    throw new Error(error.message);
  }
  return { phone, data };
}

/**
 * Verifies Supabase Phone OTP and syncs/links database Profile
 */
export async function verifyPhoneOtp(rawPhone: string, token: string): Promise<{ profile: Profile; session: any }> {
  const phone = formatIndianPhoneNumber(rawPhone);
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token: token.trim(),
    type: 'sms',
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error('Verification failed: No user returned from Supabase Auth.');
  }

  // Sync / find profile for this phone / auth user
  const profile = await syncProfileForUser(data.user.id, phone);
  return { profile, session: data.session };
}

/**
 * Syncs an authenticated user with a profile record in `profiles`.
 * If member already exists by phone, links their auth_user_id.
 * If new user, creates a new profile strictly with role = 'member'.
 */
export async function syncProfileForUser(authUserId: string, phone: string, fullName?: string): Promise<Profile> {
  const cleanPhone = phone.replace('+91', '').trim();

  // 1. Try finding by auth_user_id first
  const { data: byAuthId } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (byAuthId) {
    return byAuthId as Profile;
  }

  // 2. Try finding by phone number (either +91 format or 10-digit format)
  const { data: byPhone } = await supabase
    .from('profiles')
    .select('*')
    .or(`phone.eq.${phone},phone.eq.${cleanPhone}`)
    .maybeSingle();

  if (byPhone) {
    // Link auth_user_id to existing profile
    const { data: updated } = await supabase
      .from('profiles')
      .update({ auth_user_id: authUserId, phone: cleanPhone })
      .eq('id', byPhone.id)
      .select('*')
      .single();

    return (updated || byPhone) as Profile;
  }

  // 3. New walk-in / member: create new profile strictly with role = 'member'
  // NEVER grant admin role via frontend
  const randomSuffix = Math.floor(100 + Math.random() * 900);
  const memberNumber = `M-${randomSuffix}`;
  const qrToken = `QR_MEM_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  const newProfile = {
    auth_user_id: authUserId,
    member_number: memberNumber,
    full_name: fullName?.trim() || `Member ${cleanPhone.slice(-4)}`,
    phone: cleanPhone,
    role: 'member' as const, // Strict RBAC: All new self-registered users are members!
    status: 'active' as const,
    qr_token: qrToken
  };

  const { data: created, error } = await supabase
    .from('profiles')
    .insert([newProfile])
    .select('*')
    .single();

  if (error || !created) {
    console.error('Error creating profile for new phone user:', error);
    throw new Error(error?.message || 'Failed to initialize member profile');
  }

  // Initialize standard subscription for this new member
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await supabase.from('subscriptions').insert([
      {
        member_id: created.id,
        plan_id: '00000000-0000-0000-0000-000000000001',
        status: 'pending',
        meals_granted: 54,
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      }
    ]);
  } catch (subErr) {
    console.warn('Subscription initialization note:', subErr);
  }

  return created as Profile;
}

/**
 * Signs out current Supabase user
 */
export async function signOutUser() {
  await supabase.auth.signOut();
}

/**
 * Development / Demo convenience helper:
 * Allows switching to a known test account directly (Aarav M-101, Ramesh REC-01, Tanishk ADMIN-01)
 */
export async function getTestProfileByNumber(memberNumber: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('member_number', memberNumber)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return data as Profile;
}
