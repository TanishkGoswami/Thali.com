// Seed initial sample data into Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ooqtmpnasgricxreqzbb.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!supabaseKey) {
  console.error('Error: Please provide SUPABASE_SERVICE_ROLE_KEY environment variable to run the seed script.');
  console.error('Example: SUPABASE_SERVICE_ROLE_KEY=eyJhbGci... node scripts/seed.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding initial data into Supabase...');

  // 1. Create Staff & Sample Members
  const sampleProfiles = [
    {
      member_number: 'ADMIN-01',
      full_name: 'Tanishk Sharma (Mess Owner)',
      phone: '9876543210',
      email: 'owner@thali.com',
      role: 'owner_admin',
      status: 'active',
      qr_token: 'QR_ADMIN_01'
    },
    {
      member_number: 'REC-01',
      full_name: 'Ramesh Patel (Receptionist)',
      phone: '9876543211',
      email: 'reception@thali.com',
      role: 'receptionist',
      status: 'active',
      qr_token: 'QR_REC_01'
    },
    {
      member_number: 'M-101',
      full_name: 'Aarav Mehta',
      phone: '9876543220',
      email: 'aarav@gmail.com',
      role: 'member',
      status: 'active',
      qr_token: 'THALI_PASS_M101_SECURE'
    },
    {
      member_number: 'M-102',
      full_name: 'Priya Sharma',
      phone: '9876543221',
      email: 'priya@gmail.com',
      role: 'member',
      status: 'active',
      qr_token: 'THALI_PASS_M102_SECURE'
    },
    {
      member_number: 'M-103',
      full_name: 'Rohan Verma',
      phone: '9876543222',
      email: 'rohan@gmail.com',
      role: 'member',
      status: 'active',
      qr_token: 'THALI_PASS_M103_SECURE'
    },
    {
      member_number: 'M-104',
      full_name: 'Ananya Iyer',
      phone: '9876543223',
      email: 'ananya@gmail.com',
      role: 'member',
      status: 'active',
      qr_token: 'THALI_PASS_M104_SECURE'
    },
    {
      member_number: 'M-105',
      full_name: 'Kabir Singh',
      phone: '9876543224',
      email: 'kabir@gmail.com',
      role: 'member',
      status: 'active',
      qr_token: 'THALI_PASS_M105_SECURE'
    },
    {
      member_number: 'M-106',
      full_name: 'Sneha Kulkarni',
      phone: '9876543225',
      email: 'sneha@gmail.com',
      role: 'member',
      status: 'active',
      qr_token: 'THALI_PASS_M106_SECURE'
    }
  ];

  const { data: profiles, error: pError } = await supabase
    .from('profiles')
    .upsert(sampleProfiles, { onConflict: 'member_number' })
    .select();

  if (pError) {
    console.error('Error inserting profiles:', pError);
    return;
  }
  console.log(`Seeded ${profiles.length} profiles.`);

  // 2. Add subscriptions for members
  const aarav = profiles.find(p => p.member_number === 'M-101');
  const priya = profiles.find(p => p.member_number === 'M-102');
  const rohan = profiles.find(p => p.member_number === 'M-103');
  const ananya = profiles.find(p => p.member_number === 'M-104');
  const kabir = profiles.find(p => p.member_number === 'M-105');

  const now = new Date();
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
  const fiveDaysAgoExpired = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  const thirtyFiveDaysAgo = new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000);

  const planId = '00000000-0000-0000-0000-000000000001';

  const subs = [
    {
      member_id: aarav.id,
      plan_id: planId,
      status: 'active',
      starts_at: tenDaysAgo.toISOString(),
      expires_at: thirtyDaysLater.toISOString(),
      meals_granted: 54,
      activated_at: tenDaysAgo.toISOString()
    },
    {
      member_id: priya.id,
      plan_id: planId,
      status: 'active',
      starts_at: now.toISOString(),
      expires_at: thirtyDaysLater.toISOString(),
      meals_granted: 54,
      activated_at: now.toISOString()
    },
    {
      member_id: rohan.id,
      plan_id: planId,
      status: 'active',
      starts_at: tenDaysAgo.toISOString(),
      expires_at: thirtyDaysLater.toISOString(),
      meals_granted: 54,
      activated_at: tenDaysAgo.toISOString()
    },
    {
      member_id: ananya.id,
      plan_id: planId,
      status: 'pending',
      starts_at: now.toISOString(),
      expires_at: thirtyDaysLater.toISOString(),
      meals_granted: 54
    },
    {
      member_id: kabir.id,
      plan_id: planId,
      status: 'expired',
      starts_at: thirtyFiveDaysAgo.toISOString(),
      expires_at: fiveDaysAgoExpired.toISOString(),
      meals_granted: 54,
      activated_at: thirtyFiveDaysAgo.toISOString()
    }
  ];

  const { data: createdSubs, error: subError } = await supabase
    .from('subscriptions')
    .insert(subs)
    .select();

  if (subError) {
    console.error('Error inserting subscriptions:', subError);
    return;
  }
  console.log(`Seeded ${createdSubs.length} subscriptions.`);

  // 3. Seed some meal transactions for Aarav (12 meals consumed) & Rohan (51 meals consumed -> 3 left)
  const aaravSub = createdSubs.find(s => s.member_id === aarav.id);
  const rohanSub = createdSubs.find(s => s.member_id === rohan.id);

  const txs = [];
  // Aarav consumed 12 meals
  for (let i = 1; i <= 12; i++) {
    const d = new Date(now.getTime() - i * 18 * 60 * 60 * 1000);
    txs.push({
      member_id: aarav.id,
      subscription_id: aaravSub.id,
      service_date: d.toISOString().split('T')[0],
      meal_period: i % 2 === 0 ? 'lunch' : 'dinner',
      transaction_type: 'consumption',
      meal_delta: -1,
      status: 'accepted',
      source: 'staff_qr',
      reason: 'Check-in via staff_qr',
      created_at: d.toISOString()
    });
  }

  // Rohan consumed 51 meals (low balance!)
  for (let i = 1; i <= 51; i++) {
    const d = new Date(now.getTime() - i * 12 * 60 * 60 * 1000);
    txs.push({
      member_id: rohan.id,
      subscription_id: rohanSub.id,
      service_date: d.toISOString().split('T')[0],
      meal_period: i % 2 === 0 ? 'lunch' : 'dinner',
      transaction_type: 'consumption',
      meal_delta: -1,
      status: 'accepted',
      source: 'staff_qr',
      reason: 'Check-in via staff_qr',
      created_at: d.toISOString()
    });
  }

  const { error: txError } = await supabase.from('meal_transactions').insert(txs);
  if (txError) {
    console.error('Error inserting transactions:', txError);
  } else {
    console.log(`Seeded ${txs.length} meal transactions.`);
  }

  // 4. Seed Today's Lunch & Dinner Menus
  const todayStr = now.toISOString().split('T')[0];

  const { data: menuData, error: menuErr } = await supabase
    .from('menus')
    .upsert([
      {
        service_date: todayStr,
        meal_period: 'lunch',
        title: 'Special Shahi Thali',
        notes: 'Ghee Roti, Paneer Butter Masala & Dal Tadka',
        status: 'published'
      },
      {
        service_date: todayStr,
        meal_period: 'dinner',
        title: 'Light Homestyle Dinner',
        notes: 'Aloo Gobhi, Mix Dal & Jeera Rice',
        status: 'published'
      }
    ], { onConflict: 'service_date,meal_period' })
    .select();

  if (menuErr) {
    console.error('Error inserting menus:', menuErr);
  } else if (menuData && menuData.length > 0) {
    const lunchMenu = menuData.find(m => m.meal_period === 'lunch');
    const dinnerMenu = menuData.find(m => m.meal_period === 'dinner');

    const menuItems = [];
    if (lunchMenu) {
      menuItems.push(
        { menu_id: lunchMenu.id, name: 'Paneer Butter Masala', category: 'Special', sort_order: 1 },
        { menu_id: lunchMenu.id, name: 'Dal Makhani Tadka', category: 'Dal', sort_order: 2 },
        { menu_id: lunchMenu.id, name: 'Butter Tawa Roti (Unlimited)', category: 'Roti', sort_order: 3 },
        { menu_id: lunchMenu.id, name: 'Jeera Peas Pulao', category: 'Rice', sort_order: 4 },
        { menu_id: lunchMenu.id, name: 'Gulab Jamun (1 pc)', category: 'Sweet', sort_order: 5 },
        { menu_id: lunchMenu.id, name: 'Papad & Green Salad', category: 'Side', sort_order: 6 }
      );
    }
    if (dinnerMenu) {
      menuItems.push(
        { menu_id: dinnerMenu.id, name: 'Aloo Gobhi Matar', category: 'Sabzi', sort_order: 1 },
        { menu_id: dinnerMenu.id, name: 'Yellow Moong Dal Fry', category: 'Dal', sort_order: 2 },
        { menu_id: dinnerMenu.id, name: 'Hot Phulka Roti', category: 'Roti', sort_order: 3 },
        { menu_id: dinnerMenu.id, name: 'Steamed Basmati Rice', category: 'Rice', sort_order: 4 },
        { menu_id: dinnerMenu.id, name: 'Boondi Raita & Pickle', category: 'Side', sort_order: 5 }
      );
    }
    await supabase.from('menu_items').insert(menuItems);
    console.log(`Seeded ${menuItems.length} menu items.`);
  }

  console.log('Seeding finished successfully!');
}

seed();
