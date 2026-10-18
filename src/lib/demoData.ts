import type { Profile, DailyMenu, MealPeriod, MealPlanType } from '../types';

export const DEMO_MEMBER: Profile & {
  remaining_meals: number;
  subscription_status: string;
  expires_at: string;
  payment_method: 'cash' | 'upi_direct';
  meal_plan_type: MealPlanType;
} = {
  id: 'demo-member-aarav',
  member_number: 'M-101',
  full_name: 'Aarav Sharma',
  email: 'aarav.demo@thali.com',
  phone: '9876543210',
  role: 'member',
  status: 'active',
  subscription_status: 'active',
  remaining_meals: 42,
  meal_plan_type: 'lunch_dinner',
  expires_at: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
  payment_method: 'upi_direct',
  qr_token: 'QR_DEMO_AARAV_101',
  phone_verified: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export const DEMO_RECEPTIONIST: Profile & {
  remaining_meals?: number;
  subscription_status?: string;
  expires_at?: string;
  payment_method?: 'cash' | 'upi_direct';
} = {
  id: 'demo-receptionist-staff',
  member_number: 'STAFF-01',
  full_name: 'Vikram Singh (Desk Frontline)',
  email: 'staff@thali.com',
  phone: '9876543211',
  role: 'receptionist',
  status: 'active',
  qr_token: 'QR_DEMO_STAFF_01',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export const DEMO_ADMIN: Profile & {
  remaining_meals?: number;
  subscription_status?: string;
  expires_at?: string;
  payment_method?: 'cash' | 'upi_direct';
} = {
  id: 'demo-admin-owner',
  member_number: 'ADM-01',
  full_name: 'Rajesh Gupta (Mess Owner)',
  email: 'owner@thali.com',
  phone: '9876543212',
  role: 'owner_admin',
  status: 'active',
  qr_token: 'QR_DEMO_ADMIN_01',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

export const DEMO_MENUS: DailyMenu[] = [
  {
    id: 'demo-menu-breakfast',
    service_date: new Date().toISOString().split('T')[0],
    meal_period: 'breakfast' as MealPeriod,
    title: 'Morning Energizer',
    notes: 'Fresh hot poha, boiled sprouts, seasonal fruit & masala chai',
    status: 'published',
    items: [
      { id: 'item-1', menu_id: 'demo-menu-breakfast', name: 'Indori Poha with Sev', category: 'Special', sort_order: 1 },
      { id: 'item-2', menu_id: 'demo-menu-breakfast', name: 'Sprouted Moong Salad', category: 'Side', sort_order: 2 },
      { id: 'item-3', menu_id: 'demo-menu-breakfast', name: 'Adrak Masala Chai', category: 'Side', sort_order: 3 },
      { id: 'item-4', menu_id: 'demo-menu-breakfast', name: 'Fresh Banana', category: 'Sweet', sort_order: 4 }
    ]
  },
  {
    id: 'demo-menu-lunch',
    service_date: new Date().toISOString().split('T')[0],
    meal_period: 'lunch' as MealPeriod,
    title: 'North Indian Royal Feast',
    notes: 'Paneer Makhani, Dal Tadka, Butter Phulkas, Jeera Rice & Boondi Raita',
    status: 'published',
    items: [
      { id: 'item-5', menu_id: 'demo-menu-lunch', name: 'Paneer Butter Masala', category: 'Sabzi', sort_order: 1 },
      { id: 'item-6', menu_id: 'demo-menu-lunch', name: 'Yellow Dal Tadka', category: 'Dal', sort_order: 2 },
      { id: 'item-7', menu_id: 'demo-menu-lunch', name: 'Fresh Tawa Phulkas (Unlimited)', category: 'Roti', sort_order: 3 },
      { id: 'item-8', menu_id: 'demo-menu-lunch', name: 'Jeera Rice & Boondi Raita', category: 'Rice', sort_order: 4 }
    ]
  },
  {
    id: 'demo-menu-dinner',
    service_date: new Date().toISOString().split('T')[0],
    meal_period: 'dinner' as MealPeriod,
    title: 'Homestyle Comfort Dinner',
    notes: 'Malai Kofta, Mix Veg, Phulkas, Steamed Rice & Warm Gulab Jamun',
    status: 'published',
    items: [
      { id: 'item-9', menu_id: 'demo-menu-dinner', name: 'Shahi Malai Kofta Curry', category: 'Sabzi', sort_order: 1 },
      { id: 'item-10', menu_id: 'demo-menu-dinner', name: 'Dal Fry with Ghee', category: 'Dal', sort_order: 2 },
      { id: 'item-11', menu_id: 'demo-menu-dinner', name: 'Garma-Garam Phulkas', category: 'Roti', sort_order: 3 },
      { id: 'item-12', menu_id: 'demo-menu-dinner', name: 'Hot Gulab Jamun (1 pc)', category: 'Sweet', sort_order: 4 }
    ]
  }
];

export function isDemoUser(user?: Profile | null): boolean {
  if (!user) return false;
  return user.id.startsWith('demo-');
}
