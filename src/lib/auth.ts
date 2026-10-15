import { supabase } from './supabase';
import { sendFast2SmsOtp } from './sms';
import type { Profile } from '../types';

/**
 * In-memory map for OTP verification and profile linkage
 */
const pendingOtpMap = new Map<string, { code: string; fullName?: string; email?: string; expiresAt: number }>();

const SESSION_STORAGE_KEY = 'thali_session_user_id';

export function saveLocalSession(userId: string) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, userId);
  } catch (e) {
    console.warn('LocalStorage access note:', e);
  }
}

export function getLocalSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearLocalSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {
    console.warn('LocalStorage clear note:', e);
  }
}

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

export interface SendOtpResult {
  phone: string;
  isSimulated?: boolean;
  devCode?: string;
  message?: string;
}

/**
 * Sends real OTP via Fast2SMS Indian SMS gateway.
 * Generates an auditable 6-digit verification code.
 */
export async function sendPhoneOtp(rawPhone: string, fullName?: string, email?: string): Promise<SendOtpResult> {
  const phone = formatIndianPhoneNumber(rawPhone);
  const clean10 = phone.replace(/\D/g, '').slice(-10);

  // Generate unique 6-digit OTP
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  // Store in pending map with optional email
  pendingOtpMap.set(phone, {
    code: otpCode,
    fullName,
    email,
    expiresAt: Date.now() + 10 * 60 * 1000
  });

  // Call Fast2SMS
  const smsResult = await sendFast2SmsOtp(clean10, otpCode);

  if (smsResult.success) {
    return {
      phone,
      isSimulated: false,
      message: 'OTP SMS sent successfully to your mobile number via Fast2SMS!'
    };
  }

  // Fallback if SMS gateway is in transition
  return {
    phone,
    isSimulated: true,
    devCode: otpCode,
    message: smsResult.message || 'Fast2SMS code displayed for testing.'
  };
}

/**
 * Verifies Phone OTP and syncs/links database Profile in Supabase
 */
export async function verifyPhoneOtp(
  rawPhone: string,
  token: string,
  fullName?: string,
  email?: string
): Promise<{ profile: Profile; session: any; isSimulated?: boolean }> {
  const phone = formatIndianPhoneNumber(rawPhone);
  const pending = pendingOtpMap.get(phone);

  if (!pending) {
    throw new Error('No OTP requested for this phone number. Please click Send Code.');
  }

  if (token.trim() !== pending.code) {
    throw new Error(`Invalid verification code. Please enter the 6-digit code received.`);
  }

  // OTP verified! Remove pending entry
  pendingOtpMap.delete(phone);

  // Save / Sync profile into Supabase profiles table
  const profile = await syncProfileForUser(null, phone, fullName || pending.fullName, email || pending.email);
  saveLocalSession(profile.id);
  return { profile, session: null, isSimulated: false };
}

/**
 * Syncs an authenticated user with a profile record in `profiles`.
 * If member already exists by phone, links their record and updates details.
 * If new user, creates a new profile strictly with role = 'member'.
 */
export async function syncProfileForUser(
  authUserId: string | null,
  phone: string,
  fullName?: string,
  email?: string
): Promise<Profile> {
  const cleanPhone = phone.replace('+91', '').trim();
  const cleanEmail = email?.trim() || null;

  // 1. Try finding by auth_user_id first if provided
  if (authUserId) {
    const { data: byAuthId } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (byAuthId) {
      return byAuthId as Profile;
    }
  }

  // 2. Try finding by phone number (either +91 format or 10-digit format)
  const { data: byPhone } = await supabase
    .from('profiles')
    .select('*')
    .or(`phone.eq.${phone},phone.eq.${cleanPhone}`)
    .maybeSingle();

  if (byPhone) {
    const updatePayload: Record<string, any> = { phone: cleanPhone };
    if (authUserId) updatePayload.auth_user_id = authUserId;
    if (fullName && (!byPhone.full_name || byPhone.full_name.startsWith('Member '))) {
      updatePayload.full_name = fullName.trim();
    }
    if (cleanEmail && !byPhone.email) {
      updatePayload.email = cleanEmail;
    }

    const { data: updated } = await supabase
      .from('profiles')
      .update(updatePayload)
      .eq('id', byPhone.id)
      .select('*')
      .single();

    return (updated || byPhone) as Profile;
  }

  // 3. New member: create new profile strictly with role = 'member'
  const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
  const nextSeq = (count || 0) + 101;
  const memberNumber = `M-${nextSeq}`;
  const qrToken = `QR_MEM_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  const newProfile: Record<string, any> = {
    member_number: memberNumber,
    full_name: fullName?.trim() || `Member ${cleanPhone.slice(-4)}`,
    phone: cleanPhone,
    email: cleanEmail,
    role: 'member', // Strict RBAC: All new self-registered users are members!
    status: 'active',
    qr_token: qrToken
  };

  if (authUserId) {
    newProfile.auth_user_id = authUserId;
  }

  const { data: created, error } = await supabase
    .from('profiles')
    .insert([newProfile])
    .select('*')
    .single();

  if (error || !created) {
    console.error('Error creating profile for new phone user:', error);
    throw new Error(error?.message || 'Failed to initialize member profile in database');
  }

  // Initialize standard subscription for this new member in Supabase
  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await supabase.from('subscriptions').insert([
      {
        member_id: created.id,
        plan_id: '00000000-0000-0000-0000-000000000001',
        status: 'active',
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
 * Signs out current Supabase user and clears local session
 */
export async function signOutUser() {
  clearLocalSession();
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
