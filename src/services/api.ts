import { supabase } from '../lib/supabase';
import type { Profile, DailyMenu, CheckInResult, MealTransaction, MealPeriod, MealPlanType } from '../types';

export const COUNTER_STANDEE_QR = 'THALI_OFFICIAL_COUNTER_QR_2026';

export const api = {
  // Fetch all members with their active subscription & remaining meals
  async getMembers(): Promise<(Profile & { remaining_meals?: number; subscription_status?: string; expires_at?: string })[]> {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('member_number', { ascending: true });

    if (error || !profiles) {
      console.error('Error fetching profiles:', error);
      return [];
    }

    // Fetch active subscriptions
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('*');

    // Fetch transactions
    const { data: txs } = await supabase
      .from('meal_transactions')
      .select('subscription_id, meal_delta, status')
      .eq('status', 'accepted');

    // Fetch verified payments
    const { data: payments } = await supabase
      .from('payments')
      .select('member_id, subscription_id, method, status, amount_paise, created_at')
      .eq('status', 'verified')
      .order('created_at', { ascending: false });

    return profiles.map(profile => {
      const memberSubs = (subs || []).filter(s => s.member_id === profile.id);
      const activeSub = memberSubs.find(s => s.status === 'active') || memberSubs[0];
      const memberPayments = (payments || []).filter(p => p.member_id === profile.id);
      const latestPayment = memberPayments[0];

      let remaining = 0;
      if (activeSub) {
        const subTxs = (txs || []).filter(t => t.subscription_id === activeSub.id);
        const consumed = subTxs.reduce((sum, t) => sum + (t.meal_delta || 0), 0);
        remaining = Math.max(0, activeSub.meals_granted + consumed);
      }

      return {
        ...profile,
        meal_plan_type: (activeSub?.meal_plan_type || profile.meal_plan_type || 'lunch_dinner') as MealPlanType,
        remaining_meals: activeSub ? remaining : 0,
        subscription_status: activeSub ? activeSub.status : 'none',
        expires_at: activeSub?.expires_at,
        subscription_id: activeSub?.id,
        payment_method: latestPayment?.method as 'cash' | 'upi_direct' | undefined,
        payment_status: latestPayment ? 'verified' : (activeSub?.status === 'active' ? 'verified' : 'pending'),
        phone_verified: Boolean(profile.phone_verified)
      };
    });
  },

  // Perform atomic meal check-in
  async checkInMeal(qrToken: string, mealPeriod: MealPeriod): Promise<CheckInResult> {
    const { data, error } = await supabase.rpc('check_in_member_meal', {
      p_qr_token: qrToken,
      p_meal_period: mealPeriod
    });

    if (error) {
      console.error('Check-in RPC error:', error);
      return {
        success: false,
        code: 'ERROR',
        message: error.message || 'Check-in failed due to network error.'
      };
    }

    return data as CheckInResult;
  },

  // Get Today's Menus
  async getTodayMenus(): Promise<DailyMenu[]> {
    const today = new Date().toISOString().split('T')[0];
    const { data: menus, error } = await supabase
      .from('menus')
      .select('*, items:menu_items(*)')
      .eq('service_date', today);

    if (error || !menus) return [];
    return menus as DailyMenu[];
  },

  // Get Recent Meal Transactions
  async getRecentTransactions(): Promise<(MealTransaction & { member_name?: string; member_number?: string })[]> {
    const { data, error } = await supabase
      .from('meal_transactions')
      .select('*, profile:profiles(full_name, member_number)')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !data) return [];
    return data.map((item: any) => ({
      ...item,
      member_name: item.profile?.full_name,
      member_number: item.profile?.member_number
    }));
  },

  // Verify pending payment
  async verifyPayment(subscriptionId: string, verifierId?: string): Promise<boolean> {
    const { error: subErr } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        activated_at: new Date().toISOString(),
        starts_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', subscriptionId);

    if (subErr) {
      console.error('Error activating subscription:', subErr);
      return false;
    }

    await supabase
      .from('payments')
      .update({
        status: 'verified',
        verified_at: new Date().toISOString(),
        verified_by: verifierId
      })
      .eq('subscription_id', subscriptionId);

    return true;
  },

  // Admin approves payment and activates member pass with Cash or Online mode and 2-meal plan assignment
  async approveMemberPayment({
    memberId,
    paymentMethod,
    mealPlanType = 'lunch_dinner',
    amountPaise = 280000,
    referenceNotes,
    verifierId
  }: {
    memberId: string;
    paymentMethod: 'cash' | 'upi_direct';
    mealPlanType?: MealPlanType;
    amountPaise?: number;
    referenceNotes?: string;
    verifierId?: string;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      const planIdMap: Record<MealPlanType, string> = {
        lunch_dinner: '00000000-0000-0000-0000-000000000001',
        breakfast_lunch: '00000000-0000-0000-0000-000000000002',
        breakfast_dinner: '00000000-0000-0000-0000-000000000003',
        any_two: '00000000-0000-0000-0000-000000000004'
      };
      const planId = planIdMap[mealPlanType] || '00000000-0000-0000-0000-000000000001';

      // 1. Fetch existing subscription for this member
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let subId = existingSub?.id;

      if (existingSub) {
        const { error: subErr } = await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            plan_id: planId,
            meal_plan_type: mealPlanType,
            meals_granted: 54,
            starts_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            activated_at: new Date().toISOString()
          })
          .eq('id', existingSub.id);

        if (subErr) throw subErr;
      } else {
        const { data: newSub, error: newSubErr } = await supabase
          .from('subscriptions')
          .insert([
            {
              member_id: memberId,
              plan_id: planId,
              meal_plan_type: mealPlanType,
              status: 'active',
              meals_granted: 54,
              starts_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString(),
              activated_at: new Date().toISOString()
            }
          ])
          .select('id')
          .single();

        if (newSubErr) throw newSubErr;
        subId = newSub.id;
      }

      // Also update member's profile meal_plan_type
      await supabase
        .from('profiles')
        .update({
          meal_plan_type: mealPlanType,
          updated_at: new Date().toISOString()
        })
        .eq('id', memberId);

      // 2. Record payment in payments table
      if (subId) {
        await supabase.from('payments').insert([
          {
            member_id: memberId,
            subscription_id: subId,
            amount_paise: amountPaise,
            method: paymentMethod,
            status: 'verified',
            reference_text: referenceNotes || (paymentMethod === 'cash' ? 'Cash at Counter' : 'Online / UPI Direct'),
            verified_by: verifierId,
            verified_at: new Date().toISOString()
          }
        ]);
      }

      // 3. Audit Log
      try {
        await supabase.from('audit_logs').insert([
          {
            action: 'PAYMENT_APPROVED_ACTIVE',
            entity_type: 'subscription',
            entity_id: subId,
            reason: `Admin activated pass via ${paymentMethod === 'cash' ? 'Cash' : 'Online / UPI'} (₹${amountPaise / 100})`,
            actor_id: verifierId
          }
        ]);
      } catch (auditErr) {
        console.warn('Audit log write note:', auditErr);
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error approving member payment:', err);
      return { success: false, message: err?.message || 'Failed to approve payment.' };
    }
  },

  // Create new member registration
  async registerMember(fullName: string, phone: string, memberNumber: string): Promise<Profile | null> {
    const qrToken = `THALI_PASS_${memberNumber.replace(/[^a-zA-Z0-9]/g, '_')}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        member_number: memberNumber,
        full_name: fullName,
        phone,
        role: 'member',
        status: 'active',
        qr_token: qrToken
      })
      .select()
      .single();

    if (error) {
      console.error('Error registering member:', error);
      return null;
    }

    // Automatically create a default pending subscription
    await supabase.from('subscriptions').insert({
      member_id: data.id,
      plan_id: '00000000-0000-0000-0000-000000000001',
      status: 'pending',
      meals_granted: 54
    });

    return data;
  },

  // Get meal history for a specific member
  async getMemberHistory(memberId: string): Promise<MealTransaction[]> {
    const { data, error } = await supabase
      .from('meal_transactions')
      .select('*')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) {
      console.error('Error fetching member history:', error);
      return [];
    }
    return data as MealTransaction[];
  },

  // Adjust member meal balance with audit reason
  async adjustMemberBalance(
    memberId: string,
    subscriptionId: string,
    delta: number,
    reason: string,
    actorId?: string
  ): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];

    const { error } = await supabase.from('meal_transactions').insert({
      member_id: memberId,
      subscription_id: subscriptionId,
      service_date: today,
      meal_period: 'adjustment',
      transaction_type: 'adjustment',
      meal_delta: delta,
      status: 'accepted',
      source: 'admin',
      reason,
      actor_id: actorId
    });

    if (error) {
      console.error('Error adjusting balance:', error);
      return false;
    }

    // Also write to audit log
    await supabase.from('audit_logs').insert({
      action: 'BALANCE_ADJUSTMENT',
      entity_type: 'subscription',
      entity_id: subscriptionId,
      reason,
      after_data: { delta, member_id: memberId }
    });

    return true;
  },

  // Update member profile & optionally meal_plan_type
  async updateMemberProfile(
    memberId: string,
    updates: {
      full_name?: string;
      phone?: string;
      email?: string;
      pin_code?: string;
      meal_plan_type?: MealPlanType;
      status?: 'active' | 'inactive' | 'archived';
    }
  ): Promise<boolean> {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', memberId);

    if (error) {
      console.error('Error updating member profile:', error);
      return false;
    }

    // If meal_plan_type was updated, sync it with the active subscription
    if (updates.meal_plan_type) {
      const planIdMap: Record<MealPlanType, string> = {
        lunch_dinner: '00000000-0000-0000-0000-000000000001',
        breakfast_lunch: '00000000-0000-0000-0000-000000000002',
        breakfast_dinner: '00000000-0000-0000-0000-000000000003',
        any_two: '00000000-0000-0000-0000-000000000004'
      };
      await supabase
        .from('subscriptions')
        .update({
          meal_plan_type: updates.meal_plan_type,
          plan_id: planIdMap[updates.meal_plan_type]
        })
        .eq('member_id', memberId)
        .eq('status', 'active');
    }

    return true;
  },

  // Delete a member record permanently or archive and release phone/credentials
  async deleteMember(memberId: string): Promise<{ success: boolean; message?: string }> {
    try {
      // 1. First attempt via PostgreSQL RPC if migration is applied
      const { data: rpcData, error: rpcErr } = await supabase.rpc('admin_delete_member', { p_member_id: memberId });
      if (!rpcErr && rpcData?.success) {
        return { success: true };
      }

      // 2. Cascade delete linked records
      await supabase.from('payments').delete().eq('member_id', memberId);
      await supabase.from('meal_transactions').delete().eq('member_id', memberId);

      // Delete subscriptions
      const { error: subErr } = await supabase.from('subscriptions').delete().eq('member_id', memberId);
      if (subErr) {
        // If subscriptions cannot be deleted due to foreign key restrictions, archive profile and clear phone/email to free credentials
        console.warn('Subscriptions delete restricted, archiving profile:', subErr);
        const { error: archErr } = await supabase
          .from('profiles')
          .update({
            status: 'archived',
            phone: null,
            email: null,
            member_number: `ARCHIVED_${Date.now()}_${memberId.slice(0, 4)}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', memberId);

        if (!archErr) {
          return { success: true, message: 'Member archived and credentials released.' };
        }
        return { success: false, message: subErr.message };
      }

      // Delete profile permanently
      const { error: profErr } = await supabase.from('profiles').delete().eq('id', memberId);
      if (profErr) {
        return { success: false, message: profErr.message };
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error in deleteMember:', err);
      return { success: false, message: err?.message || 'Delete operation failed' };
    }
  },

  // Extend active subscription validity
  async extendSubscription(subscriptionId: string, additionalDays: number): Promise<boolean> {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('expires_at')
      .eq('id', subscriptionId)
      .single();

    if (!sub) return false;

    const currentExpiry = sub.expires_at ? new Date(sub.expires_at) : new Date();
    const newExpiry = new Date(currentExpiry.getTime() + additionalDays * 24 * 60 * 60 * 1000);

    const { error } = await supabase
      .from('subscriptions')
      .update({ expires_at: newExpiry.toISOString() })
      .eq('id', subscriptionId);

    return !error;
  },

  // Save or update daily menu and its items
  async saveDailyMenu(
    serviceDate: string,
    mealPeriod: MealPeriod,
    title: string,
    notes: string,
    items: { name: string; category: 'Dal' | 'Sabzi' | 'Roti' | 'Rice' | 'Special' | 'Sweet' | 'Side' }[]
  ): Promise<boolean> {
    try {
      // 1. Upsert menu header
      const { data: menu, error: menuErr } = await supabase
        .from('menus')
        .upsert(
          {
            service_date: serviceDate,
            meal_period: mealPeriod,
            title,
            notes,
            status: 'published',
            updated_at: new Date().toISOString()
          },
          { onConflict: 'service_date,meal_period' }
        )
        .select()
        .single();

      if (menuErr || !menu) {
        console.error('Error upserting menu:', menuErr);
        return false;
      }

      // 2. Clear old items for this menu
      await supabase.from('menu_items').delete().eq('menu_id', menu.id);

      // 3. Insert new items
      if (items.length > 0) {
        const itemRows = items.map((it, idx) => ({
          menu_id: menu.id,
          name: it.name,
          category: it.category,
          sort_order: idx + 1
        }));

        const { error: itemsErr } = await supabase.from('menu_items').insert(itemRows);
        if (itemsErr) {
          console.error('Error inserting menu items:', itemsErr);
          return false;
        }
      }

      return true;
    } catch (err) {
      console.error('Unexpected error in saveDailyMenu:', err);
      return false;
    }
  },

  // Batch import members from CSV spreadsheet
  async batchImportMembers(
    records: { member_number: string; full_name: string; phone?: string; remaining_meals?: number }[]
  ): Promise<{ success: number; failed: number; errors: string[] }> {
    let success = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const r of records) {
      try {
        const cleanNumber = r.member_number.trim();
        const cleanName = r.full_name.trim();
        if (!cleanNumber || !cleanName) {
          failed++;
          continue;
        }

        const qrToken = `THALI_PASS_${cleanNumber.replace(/[^a-zA-Z0-9]/g, '_')}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        // Insert or ignore profile
        const { data: profile, error: pErr } = await supabase
          .from('profiles')
          .insert({
            member_number: cleanNumber,
            full_name: cleanName,
            phone: r.phone?.trim() || null,
            role: 'member',
            status: 'active',
            qr_token: qrToken
          })
          .select()
          .single();

        if (pErr || !profile) {
          failed++;
          errors.push(`Row #${cleanNumber}: ${pErr?.message || 'Could not insert profile'}`);
          continue;
        }

        const totalMeals = r.remaining_meals !== undefined && !isNaN(r.remaining_meals) ? r.remaining_meals : 54;

        // Create active subscription
        const now = new Date();
        const expiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const { error: subErr } = await supabase.from('subscriptions').insert({
          member_id: profile.id,
          plan_id: '00000000-0000-0000-0000-000000000001',
          status: 'active',
          starts_at: now.toISOString(),
          expires_at: expiry.toISOString(),
          meals_granted: totalMeals,
          activated_at: now.toISOString()
        });

        if (subErr) {
          failed++;
          errors.push(`Row #${cleanNumber} subscription: ${subErr.message}`);
        } else {
          success++;
        }
      } catch (err: any) {
        failed++;
        errors.push(`Row #${r.member_number}: ${err?.message || 'Unknown error'}`);
      }
    }

    return { success, failed, errors };
  }
};

