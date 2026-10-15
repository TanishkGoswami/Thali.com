import { supabase } from './supabase';
import { sendFast2SmsOtp } from './sms';
import type { Profile, MealPlanType } from '../types';

/**
 * In-memory map for OTP verification during Payment / Phone Activation
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
 * Everyday 100% Free Login using Email or Member ID + Secret PIN / Unique Access Code.
 * Zero SMS cost, instant 1-second sign-in!
 */
export async function loginWithEmailOrIdAndPin(identifier: string, pin: string): Promise<Profile> {
  const cleanId = identifier.trim();
  const cleanPin = pin.trim();

  if (!cleanId) {
    throw new Error('Please enter your Email or Member Number.');
  }
  if (!cleanPin) {
    throw new Error('Please enter your 4-digit PIN / Access Code.');
  }

  // Find profile by email OR member_number OR phone
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .or(`email.ilike.${cleanId},member_number.ilike.${cleanId},phone.eq.${cleanId.replace(/\D/g, '')}`)
    .maybeSingle();

  if (error || !profile) {
    throw new Error(`Account not found for "${cleanId}". Please register or check your details.`);
  }

  // If pin_code is set, check it; if not yet set in legacy account, auto-set it to this PIN!
  if (profile.pin_code && profile.pin_code !== cleanPin) {
    throw new Error('Incorrect PIN / Access Code. Please enter the correct code.');
  }

  if (!profile.pin_code) {
    // Save this PIN as the member's permanent access code
    await supabase.from('profiles').update({ pin_code: cleanPin }).eq('id', profile.id);
  }

  saveLocalSession(profile.id);
  return profile as Profile;
}

/**
 * New Member Registration:
 * User sets Name, Email, and a secret 4-Digit Access PIN.
 * Plan is initialized in 'pending' status until verified via Phone OTP during payment!
 */
export async function registerNewMember(fullName: string, email: string, pinCode: string): Promise<Profile> {
  const cleanName = fullName.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPin = pinCode.trim();

  if (!cleanName) throw new Error('Please enter your full name.');
  if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Please enter a valid email address.');
  if (!cleanPin || cleanPin.length < 4) throw new Error('Please create a 4 to 6 digit secret PIN.');

  // Check if email already registered
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, member_number')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (existing) {
    throw new Error(`An account already exists with ${cleanEmail}. Please Sign In with your PIN.`);
  }

  // Calculate next truly unique member number
  const { data: allProfiles } = await supabase.from('profiles').select('member_number');
  const existingSet = new Set((allProfiles || []).map(p => p.member_number));
  const existingNumbers = (allProfiles || [])
    .map(p => {
      const match = p.member_number?.match(/^M-(\d+)$/i);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(n => !isNaN(n) && n > 0);

  let nextSeq = (existingNumbers.length > 0 ? Math.max(...existingNumbers) : 100) + 1;
  while (existingSet.has(`M-${nextSeq}`)) {
    nextSeq++;
  }
  const memberNumber = `M-${nextSeq}`;
  const qrToken = `QR_MEM_${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

  const newProfile = {
    member_number: memberNumber,
    full_name: cleanName,
    email: cleanEmail,
    pin_code: cleanPin,
    role: 'member' as const, // Strict RBAC
    status: 'active' as const,
    phone_verified: false,
    qr_token: qrToken
  };

  const { data: created, error } = await supabase
    .from('profiles')
    .insert([newProfile])
    .select('*')
    .single();

  if (error || !created) {
    console.error('Error creating new member:', error);
    throw new Error(error?.message || 'Failed to initialize account.');
  }

  // Initialize pending subscription (activates upon payment + phone OTP verification)
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

  saveLocalSession(created.id);
  return created as Profile;
}

/**
 * Triggers Fast2SMS real OTP to verify member's phone number during Payment / Plan Activation
 */
export async function sendPaymentVerificationOtp(rawPhone: string, memberId?: string): Promise<SendOtpResult> {
  const phone = formatIndianPhoneNumber(rawPhone);
  const clean10 = phone.replace(/\D/g, '').slice(-10);

  if (clean10.length !== 10) {
    throw new Error('Please enter a valid 10-digit Indian mobile number.');
  }

  // Cost & Security Guard: Block OTP request if member payment is not confirmed by admin!
  if (memberId) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('member_id', memberId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();

    if (!sub) {
      throw new Error(
        'Payment not confirmed by Mess Admin. OTP can only be requested after the admin marks your payment (Cash or UPI) as received at the counter.'
      );
    }
  }

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

  pendingOtpMap.set(phone, {
    code: otpCode,
    expiresAt: Date.now() + 10 * 60 * 1000
  });

  const smsResult = await sendFast2SmsOtp(clean10, otpCode);

  if (smsResult.success) {
    return {
      phone,
      isSimulated: false,
      message: 'Verification OTP sent to your mobile phone via Fast2SMS!'
    };
  }

  return {
    phone,
    isSimulated: true,
    devCode: otpCode,
    message: smsResult.message || 'OTP code ready for activation.'
  };
}

/**
 * Verifies Phone OTP during Payment and Activates the ₹2,800 54-meal subscription with chosen 2-meal plan
 */
export async function verifyPaymentPhoneAndActivate(
  memberId: string,
  rawPhone: string,
  token: string,
  mealPlanType: MealPlanType = 'lunch_dinner',
  paymentMethod: 'cash' | 'upi_direct' = 'upi_direct'
): Promise<{ profile: Profile; subscription: any }> {
  const phone = formatIndianPhoneNumber(rawPhone);
  const clean10 = phone.replace(/\D/g, '').slice(-10);
  const pending = pendingOtpMap.get(phone);

  if (!pending) {
    throw new Error('No OTP was requested for this phone number. Please click Send OTP.');
  }

  if (token.trim() !== pending.code) {
    throw new Error('Invalid OTP code. Please enter the 6-digit code received on your phone.');
  }

  pendingOtpMap.delete(phone);

  // 1. Update Profile: link verified phone and selected 2-meal plan
  const { data: updatedProfile, error: profErr } = await supabase
    .from('profiles')
    .update({
      phone: clean10,
      phone_verified: true,
      meal_plan_type: mealPlanType,
      updated_at: new Date().toISOString()
    })
    .eq('id', memberId)
    .select('*')
    .single();

  if (profErr || !updatedProfile) {
    throw new Error(profErr?.message || 'Failed to update verified phone in profile.');
  }

  // 2. Activate or Create 54-Meal Subscription with chosen 2-meal plan
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const planIdMap: Record<MealPlanType, string> = {
    lunch_dinner: '00000000-0000-0000-0000-000000000001',
    breakfast_lunch: '00000000-0000-0000-0000-000000000002',
    breakfast_dinner: '00000000-0000-0000-0000-000000000003',
    any_two: '00000000-0000-0000-0000-000000000004'
  };
  const planId = planIdMap[mealPlanType] || '00000000-0000-0000-0000-000000000001';

  // Check existing pending subscription
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let subData;
  if (existingSub) {
    const { data: activatedSub } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        plan_id: planId,
        meal_plan_type: mealPlanType,
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        meals_granted: 54,
        activated_at: new Date().toISOString()
      })
      .eq('id', existingSub.id)
      .select('*')
      .single();
    subData = activatedSub;
  } else {
    const { data: newSub } = await supabase
      .from('subscriptions')
      .insert([
        {
          member_id: memberId,
          plan_id: planId,
          meal_plan_type: mealPlanType,
          status: 'active',
          starts_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          meals_granted: 54,
          activated_at: new Date().toISOString()
        }
      ])
      .select('*')
      .single();
    subData = newSub;
  }

  // 3. Record Payment in payments table
  if (subData) {
    await supabase.from('payments').insert([
      {
        member_id: memberId,
        subscription_id: subData.id,
        amount_paise: 280000,
        method: paymentMethod,
        status: 'verified',
        received_at: new Date().toISOString()
      }
    ]);
  }

  return { profile: updatedProfile as Profile, subscription: subData };
}

/**
 * Signs out current user
 */
export async function signOutUser() {
  clearLocalSession();
  await supabase.auth.signOut();
}

/**
 * Quick Test Account Switcher
 */
export async function getTestProfileByNumber(memberNumber: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('member_number', memberNumber)
    .maybeSingle();

  if (error || !data) return null;
  return data as Profile;
}
