// ==============================================================================
// Thali.com — TypeScript Domain Types
// ==============================================================================

export type Role = 'owner_admin' | 'receptionist' | 'member' | 'menu_manager';

export type ProfileStatus = 'active' | 'inactive' | 'archived';

export interface Profile {
  id: string;
  member_number: string; // e.g. "TH-001", "101"
  full_name: string;
  phone?: string;
  email?: string;
  role: Role;
  status: ProfileStatus;
  qr_token: string; // Opaque random token for scanning
  pin_code?: string;
  phone_verified?: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price_paise: number; // 280000 = ₹2,800
  meal_allowance: number; // 54
  validity_days: number; // 30
  is_active: boolean;
}

export type SubscriptionStatus = 'pending' | 'queued' | 'active' | 'expired' | 'cancelled' | 'refunded';

export interface Subscription {
  id: string;
  member_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  starts_at: string;
  expires_at: string;
  meals_granted: number;
  activated_at?: string;
  created_at: string;
}

export type PaymentMethod = 'cash' | 'upi_direct' | 'gateway';
export type PaymentStatus = 'pending' | 'verified' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  member_id: string;
  subscription_id: string;
  amount_paise: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference_text?: string;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
}

export type MealPeriod = 'lunch' | 'dinner';

export interface MealSession {
  id: string;
  service_date: string; // YYYY-MM-DD
  meal_period: MealPeriod;
  starts_at: string;
  ends_at: string;
  status: 'scheduled' | 'open' | 'closed';
}

export interface MealTransaction {
  id: string;
  member_id: string;
  subscription_id: string;
  service_date: string;
  meal_period: MealPeriod | 'adjustment';
  transaction_type: 'consumption' | 'grant' | 'adjustment' | 'reversal';
  meal_delta: number; // -1 for consumption
  status: 'accepted' | 'reversed' | 'rejected';
  source: 'staff_qr' | 'venue_qr' | 'manual' | 'admin';
  actor_id?: string;
  reason?: string;
  created_at: string;
}

export interface MenuItem {
  id: string;
  menu_id: string;
  name: string;
  category: 'Dal' | 'Sabzi' | 'Roti' | 'Rice' | 'Special' | 'Sweet' | 'Side';
  description?: string;
  sort_order: number;
}

export interface DailyMenu {
  id: string;
  service_date: string;
  meal_period: MealPeriod;
  title?: string;
  notes?: string;
  status: 'draft' | 'published' | 'archived';
  items: MenuItem[];
}

export interface CheckInResult {
  success: boolean;
  code: 'ACCEPTED' | 'DUPLICATE_CHECKIN' | 'ZERO_BALANCE' | 'SUBSCRIPTION_EXPIRED' | 'PAYMENT_PENDING' | 'INVALID_QR' | 'MEMBER_INACTIVE' | 'ERROR';
  message: string;
  member_name?: string;
  member_number?: string;
  meal_period?: string;
  remaining_meals?: number;
  transaction_id?: string;
  timestamp?: string;
}
