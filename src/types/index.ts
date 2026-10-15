// ==============================================================================
// Thali.com — TypeScript Domain Types
// ==============================================================================

export type Role = 'owner_admin' | 'receptionist' | 'member' | 'menu_manager';

export type ProfileStatus = 'active' | 'inactive' | 'archived';

export type MealPeriod = 'breakfast' | 'lunch' | 'dinner';

export type MealPlanType = 'lunch_dinner' | 'breakfast_lunch' | 'breakfast_dinner' | 'any_two';

export const MEAL_PLAN_CONFIG: Record<MealPlanType, {
  name: string;
  hindiName: string;
  shortLabel: string;
  allowedPeriods: MealPeriod[] | 'any_two';
  badgeClass: string;
  badgeStyle: { backgroundColor: string; color: string; border: string };
  timeSlotsText: string;
  description: string;
}> = {
  lunch_dinner: {
    name: 'Lunch & Dinner',
    hindiName: 'Lunch & Dinner',
    shortLabel: 'Lunch + Dinner',
    allowedPeriods: ['lunch', 'dinner'],
    badgeClass: 'badge-indigo',
    badgeStyle: { backgroundColor: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' },
    timeSlotsText: '12:00-15:30 & 19:30-22:30',
    description: 'Covers afternoon Lunch and evening Dinner'
  },
  breakfast_lunch: {
    name: 'Breakfast & Lunch',
    hindiName: 'Breakfast & Lunch',
    shortLabel: 'Breakfast + Lunch',
    allowedPeriods: ['breakfast', 'lunch'],
    badgeClass: 'badge-active',
    badgeStyle: { backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' },
    timeSlotsText: '07:30-10:30 & 12:00-15:30',
    description: 'Covers morning Breakfast and afternoon Lunch'
  },
  breakfast_dinner: {
    name: 'Breakfast & Dinner',
    hindiName: 'Breakfast & Dinner',
    shortLabel: 'Breakfast + Dinner',
    allowedPeriods: ['breakfast', 'dinner'],
    badgeClass: 'badge-purple',
    badgeStyle: { backgroundColor: '#faf5ff', color: '#7e22ce', border: '1px solid #e9d5ff' },
    timeSlotsText: '07:30-10:30 & 19:30-22:30',
    description: 'Covers morning Breakfast and evening Dinner'
  },
  any_two: {
    name: 'Flexible Any 2',
    hindiName: 'Flexible Any 2',
    shortLabel: 'Flexible Any 2',
    allowedPeriods: 'any_two',
    badgeClass: 'badge-warning',
    badgeStyle: { backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' },
    timeSlotsText: 'Any 2 meals per day (Max 2/day)',
    description: 'Choice of any 2 meals per day out of Breakfast, Lunch, or Dinner'
  }
};

export interface Profile {
  id: string;
  member_number: string; // e.g. "TH-001", "101"
  full_name: string;
  phone?: string;
  email?: string;
  role: Role;
  status: ProfileStatus;
  meal_plan_type?: MealPlanType;
  qr_token: string; // Opaque random token for scanning
  pin_code?: string;
  phone_verified?: boolean;
  payment_method?: 'cash' | 'upi_direct';
  payment_status?: 'pending' | 'verified';
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price_paise: number; // 280000 = ₹2,800
  meal_allowance: number; // 54
  validity_days: number; // 30
  meal_plan_type?: MealPlanType;
  is_active: boolean;
}

export type SubscriptionStatus = 'pending' | 'queued' | 'active' | 'expired' | 'cancelled' | 'refunded';

export interface Subscription {
  id: string;
  member_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  meal_plan_type?: MealPlanType;
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
  code: 'ACCEPTED' | 'DUPLICATE_CHECKIN' | 'ZERO_BALANCE' | 'SUBSCRIPTION_EXPIRED' | 'PAYMENT_PENDING' | 'PHONE_NOT_VERIFIED' | 'INVALID_QR' | 'MEMBER_INACTIVE' | 'PLAN_NOT_PERMITTED' | 'DAILY_LIMIT_EXCEEDED' | 'MEAL_SKIPPED' | 'ERROR';
  message: string;
  member_name?: string;
  member_number?: string;
  meal_period?: string;
  meal_plan_type?: MealPlanType;
  remaining_meals?: number;
  transaction_id?: string;
  timestamp?: string;
}

export interface MealSkip {
  id: string;
  member_id: string;
  service_date: string; // YYYY-MM-DD
  meal_period: MealPeriod;
  reason?: string;
  created_at: string;
}

export interface PeriodHeadcount {
  enrolled: number;
  skipped: number;
  consumed: number;
}

export interface DailyHeadcount {
  service_date: string;
  breakfast: PeriodHeadcount;
  lunch: PeriodHeadcount;
  dinner: PeriodHeadcount;
}

export const MEAL_CUTOFF_CONFIG: Record<MealPeriod, { hour: number; minute: number; timeStr: string; hindiLabel: string; label: string }> = {
  breakfast: { hour: 6, minute: 30, timeStr: '06:30 AM', hindiLabel: 'Until 06:30 AM', label: 'Previous night up to 06:30 AM' },
  lunch: { hour: 12, minute: 30, timeStr: '12:30 PM', hindiLabel: 'Until 12:30 PM', label: 'Before 12:30 PM' },
  dinner: { hour: 18, minute: 30, timeStr: '06:30 PM', hindiLabel: 'Until 06:30 PM', label: 'Before 06:30 PM' }
};

export function isMealCutoffPassed(serviceDateStr: string, period: MealPeriod): boolean {
  const now = new Date();
  const [y, m, d] = serviceDateStr.split('-').map(Number);
  const cutoffDate = new Date(y, m - 1, d, MEAL_CUTOFF_CONFIG[period].hour, MEAL_CUTOFF_CONFIG[period].minute, 0, 0);
  return now.getTime() > cutoffDate.getTime();
}
