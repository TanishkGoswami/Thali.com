-- ==============================================================================
-- Thali.com — Migration 004: Meal Skip ("Not Coming") & Kitchen Headcount System
-- Supports:
-- 1. meal_skips table with unique (member_id, service_date, meal_period)
-- 2. Stored procedure check_in_member_meal blocks check-in if meal was skipped
-- 3. Stored procedure get_meal_headcount aggregates exact plates to cook
-- 4. Cascading clean-up on member delete
-- ==============================================================================

-- 1. Create meal_skips table
CREATE TABLE IF NOT EXISTS public.meal_skips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    service_date DATE NOT NULL,
    meal_period TEXT NOT NULL CHECK (meal_period IN ('breakfast', 'lunch', 'dinner')),
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_member_service_meal UNIQUE (member_id, service_date, meal_period)
);

CREATE INDEX IF NOT EXISTS idx_meal_skips_date_period ON public.meal_skips(service_date, meal_period);
CREATE INDEX IF NOT EXISTS idx_meal_skips_member ON public.meal_skips(member_id);

-- Enable RLS and permissive policies for seamless operation
ALTER TABLE public.meal_skips ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'meal_skips' AND policyname = 'Allow select meal_skips'
    ) THEN
        CREATE POLICY "Allow select meal_skips" ON public.meal_skips FOR SELECT USING (TRUE);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'meal_skips' AND policyname = 'Allow insert meal_skips'
    ) THEN
        CREATE POLICY "Allow insert meal_skips" ON public.meal_skips FOR INSERT WITH CHECK (TRUE);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'meal_skips' AND policyname = 'Allow delete meal_skips'
    ) THEN
        CREATE POLICY "Allow delete meal_skips" ON public.meal_skips FOR DELETE USING (TRUE);
    END IF;
END $$;

-- 2. Update check_in_member_meal to check for meal_skips
CREATE OR REPLACE FUNCTION public.check_in_member_meal(
    p_qr_token TEXT,
    p_meal_period TEXT,
    p_service_date DATE DEFAULT CURRENT_DATE,
    p_actor_id UUID DEFAULT NULL,
    p_source TEXT DEFAULT 'staff_qr',
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_member RECORD;
    v_subscription RECORD;
    v_remaining INTEGER;
    v_duplicate_exists BOOLEAN;
    v_is_skipped BOOLEAN;
    v_today_consumed_count INTEGER;
    v_transaction_id UUID;
    v_new_balance INTEGER;
    v_plan_type TEXT;
BEGIN
    -- 1. Find member by QR token
    SELECT id, member_number, full_name, status, phone_verified, meal_plan_type
    INTO v_member
    FROM public.profiles
    WHERE qr_token = p_qr_token
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'INVALID_QR',
            'message', 'Invalid QR code. Member not found.'
        );
    END IF;

    IF v_member.status != 'active' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'MEMBER_INACTIVE',
            'message', 'Member account is currently deactivated or archived.'
        );
    END IF;

    -- Check phone verification requirement
    IF v_member.phone_verified IS NOT TRUE THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'PHONE_NOT_VERIFIED',
            'message', 'Phone Verification Required: Please verify your mobile number via OTP before dining.',
            'member_name', v_member.full_name,
            'member_number', v_member.member_number
        );
    END IF;

    -- 2. Find Active & Verified Subscription
    SELECT id, status, starts_at, expires_at, meals_granted, meal_plan_type
    INTO v_subscription
    FROM public.subscriptions
    WHERE member_id = v_member.id
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at >= NOW())
    ORDER BY starts_at ASC
    LIMIT 1
    FOR UPDATE; -- Lock row to prevent race conditions

    IF NOT FOUND THEN
        IF EXISTS (SELECT 1 FROM public.subscriptions WHERE member_id = v_member.id AND status = 'pending') THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'code', 'PAYMENT_PENDING',
                'message', 'Subscription payment is pending verification by Mess Admin.'
            );
        ELSIF EXISTS (SELECT 1 FROM public.subscriptions WHERE member_id = v_member.id AND status = 'expired') THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'code', 'SUBSCRIPTION_EXPIRED',
                'message', 'Member subscription has expired. Please renew.'
            );
        ELSE
            RETURN jsonb_build_object(
                'success', FALSE,
                'code', 'NO_ACTIVE_SUBSCRIPTION',
                'message', 'No active subscription found for this member.'
            );
        END IF;
    END IF;

    -- Determine effective meal plan type (subscription takes precedence, then profile)
    v_plan_type := COALESCE(v_subscription.meal_plan_type, v_member.meal_plan_type, 'lunch_dinner');

    -- 3. Calculate remaining balance
    v_remaining := public.get_subscription_remaining_meals(v_subscription.id);
    IF v_remaining <= 0 THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'ZERO_BALANCE',
            'message', 'No meals remaining in current subscription pass.',
            'member_name', v_member.full_name,
            'member_number', v_member.member_number,
            'remaining_meals', 0
        );
    END IF;

    -- 4. Check if member marked "Not Coming" (Skipped) for this meal session
    SELECT EXISTS (
        SELECT 1
        FROM public.meal_skips
        WHERE member_id = v_member.id
          AND service_date = p_service_date
          AND meal_period = p_meal_period
    ) INTO v_is_skipped;

    IF v_is_skipped THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'MEAL_SKIPPED',
            'message', format('Aapne aaj %s ke liye "Not Coming" (Skip) mark kiya tha. Check-in allowed nahi hai.',
                CASE p_meal_period 
                    WHEN 'breakfast' THEN 'नाश्ता (Breakfast)' 
                    WHEN 'lunch' THEN 'दोपहर का खाना (Lunch)' 
                    ELSE 'रात का खाना (Dinner)' 
                END),
            'member_name', v_member.full_name,
            'member_number', v_member.member_number,
            'meal_period', p_meal_period,
            'remaining_meals', v_remaining
        );
    END IF;

    -- 5. Enforce 2-Meal Plan Slot Permissions
    IF v_plan_type = 'lunch_dinner' AND p_meal_period = 'breakfast' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'PLAN_NOT_PERMITTED',
            'message', 'Aapka subscription Lunch & Dinner (दोपहर और रात) ka hai. Breakfast (नाश्ता) allowed nahi hai.',
            'member_name', v_member.full_name,
            'member_number', v_member.member_number,
            'remaining_meals', v_remaining
        );
    ELSIF v_plan_type = 'breakfast_lunch' AND p_meal_period = 'dinner' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'PLAN_NOT_PERMITTED',
            'message', 'Aapka subscription Breakfast & Lunch (नाश्ता और दोपहर) ka hai. Dinner (रात का खाना) allowed nahi hai.',
            'member_name', v_member.full_name,
            'member_number', v_member.member_number,
            'remaining_meals', v_remaining
        );
    ELSIF v_plan_type = 'breakfast_dinner' AND p_meal_period = 'lunch' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'PLAN_NOT_PERMITTED',
            'message', 'Aapka subscription Breakfast & Dinner (नाश्ता और रात) ka hai. Lunch (दोपहर का खाना) allowed nahi hai.',
            'member_name', v_member.full_name,
            'member_number', v_member.member_number,
            'remaining_meals', v_remaining
        );
    ELSIF v_plan_type = 'any_two' THEN
        -- Check total consumption count today (max 2 meals per day)
        SELECT COUNT(*)
        INTO v_today_consumed_count
        FROM public.meal_transactions
        WHERE member_id = v_member.id
          AND service_date = p_service_date
          AND status = 'accepted'
          AND transaction_type = 'consumption';

        IF v_today_consumed_count >= 2 THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'code', 'DAILY_LIMIT_EXCEEDED',
                'message', 'Daily limit reached! You have already consumed your 2 allowed meals for today.',
                'member_name', v_member.full_name,
                'member_number', v_member.member_number,
                'remaining_meals', v_remaining
            );
        END IF;
    END IF;

    -- 6. Check Duplicate Policy: 1 check-in per member per meal slot per date
    SELECT EXISTS (
        SELECT 1
        FROM public.meal_transactions
        WHERE member_id = v_member.id
          AND service_date = p_service_date
          AND meal_period = p_meal_period
          AND status = 'accepted'
          AND transaction_type = 'consumption'
    ) INTO v_duplicate_exists;

    IF v_duplicate_exists THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'DUPLICATE_CHECKIN',
            'message', format('Already checked in for %s today.', p_meal_period),
            'member_name', v_member.full_name,
            'member_number', v_member.member_number,
            'meal_period', p_meal_period,
            'remaining_meals', v_remaining
        );
    END IF;

    -- 7. Deduct 1 Meal Atomically
    INSERT INTO public.meal_transactions (
        member_id,
        subscription_id,
        service_date,
        meal_period,
        transaction_type,
        meal_delta,
        status,
        source,
        idempotency_key,
        actor_id,
        reason
    ) VALUES (
        v_member.id,
        v_subscription.id,
        p_service_date,
        p_meal_period,
        'consumption',
        -1,
        'accepted',
        p_source,
        p_idempotency_key,
        p_actor_id,
        format('Check-in via %s', p_source)
    ) RETURNING id INTO v_transaction_id;

    v_new_balance := v_remaining - 1;

    RETURN jsonb_build_object(
        'success', TRUE,
        'code', 'ACCEPTED',
        'message', 'Meal check-in successful!',
        'transaction_id', v_transaction_id,
        'member_id', v_member.id,
        'member_name', v_member.full_name,
        'member_number', v_member.member_number,
        'meal_period', p_meal_period,
        'service_date', p_service_date,
        'remaining_meals', v_new_balance,
        'meal_plan_type', v_plan_type,
        'timestamp', NOW()
    );
END;
$$;

-- 3. Stored Procedure: get_meal_headcount for kitchen preparation
CREATE OR REPLACE FUNCTION public.get_meal_headcount(p_service_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'service_date', p_service_date,
        'breakfast', jsonb_build_object(
            'enrolled', COUNT(DISTINCT s.member_id) FILTER (WHERE s.meal_plan_type IN ('breakfast_lunch', 'breakfast_dinner', 'any_two')),
            'skipped', (SELECT COUNT(*) FROM public.meal_skips ms WHERE ms.service_date = p_service_date AND ms.meal_period = 'breakfast'),
            'consumed', (SELECT COUNT(*) FROM public.meal_transactions mt WHERE mt.service_date = p_service_date AND mt.meal_period = 'breakfast' AND mt.status = 'accepted' AND mt.transaction_type = 'consumption')
        ),
        'lunch', jsonb_build_object(
            'enrolled', COUNT(DISTINCT s.member_id) FILTER (WHERE s.meal_plan_type IN ('lunch_dinner', 'breakfast_lunch', 'any_two')),
            'skipped', (SELECT COUNT(*) FROM public.meal_skips ms WHERE ms.service_date = p_service_date AND ms.meal_period = 'lunch'),
            'consumed', (SELECT COUNT(*) FROM public.meal_transactions mt WHERE mt.service_date = p_service_date AND mt.meal_period = 'lunch' AND mt.status = 'accepted' AND mt.transaction_type = 'consumption')
        ),
        'dinner', jsonb_build_object(
            'enrolled', COUNT(DISTINCT s.member_id) FILTER (WHERE s.meal_plan_type IN ('lunch_dinner', 'breakfast_dinner', 'any_two')),
            'skipped', (SELECT COUNT(*) FROM public.meal_skips ms WHERE ms.service_date = p_service_date AND ms.meal_period = 'dinner'),
            'consumed', (SELECT COUNT(*) FROM public.meal_transactions mt WHERE mt.service_date = p_service_date AND mt.meal_period = 'dinner' AND mt.status = 'accepted' AND mt.transaction_type = 'consumption')
        )
    )
    INTO v_result
    FROM public.subscriptions s
    JOIN public.profiles p ON p.id = s.member_id
    WHERE s.status = 'active'
      AND p.status = 'active'
      AND p.phone_verified IS TRUE
      AND (s.expires_at IS NULL OR s.expires_at >= p_service_date);

    RETURN v_result;
END;
$$;

-- 4. Clean up skips on admin_delete_member
CREATE OR REPLACE FUNCTION public.admin_delete_member(p_member_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.meal_skips WHERE member_id = p_member_id;
    DELETE FROM public.meal_transactions WHERE member_id = p_member_id;
    DELETE FROM public.payments WHERE member_id = p_member_id;
    DELETE FROM public.subscriptions WHERE member_id = p_member_id;
    DELETE FROM public.profiles WHERE id = p_member_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'message', 'Member and all associated subscriptions, skips and transactions permanently deleted.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', FALSE,
        'error', SQLERRM
    );
END;
$$;
