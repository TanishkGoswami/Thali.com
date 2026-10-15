-- ==============================================================================
-- Thali.com — Migration 003: 2-Meal Subscription Plans & Breakfast Support
-- Supports:
-- 1. Breakfast period in meal_sessions, menus, meal_transactions
-- 2. Four 2-Meal Plan options:
--    - lunch_dinner: Lunch + Dinner (दोपहर + रात)
--    - breakfast_lunch: Breakfast + Lunch (नाश्ता + दोपहर)
--    - breakfast_dinner: Breakfast + Dinner (नाश्ता + रात)
--    - any_two: Flexible any 2 meals / day (कोई भी 2 समय)
-- 3. Stored procedure check_in_member_meal slot enforcement and daily limit
-- ==============================================================================

-- 1. Safely update check constraints to permit 'breakfast'
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop existing CHECK constraints on meal_sessions involving meal_period
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.meal_sessions'::regclass 
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%meal_period%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.meal_sessions DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;

    -- Drop existing CHECK constraints on menus involving meal_period
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.menus'::regclass 
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%meal_period%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.menus DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;

    -- Drop existing CHECK constraints on meal_transactions involving meal_period
    FOR r IN (
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.meal_transactions'::regclass 
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%meal_period%'
    ) LOOP
        EXECUTE 'ALTER TABLE public.meal_transactions DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE public.meal_sessions 
    ADD CONSTRAINT meal_sessions_meal_period_check CHECK (meal_period IN ('breakfast', 'lunch', 'dinner'));

ALTER TABLE public.menus 
    ADD CONSTRAINT menus_meal_period_check CHECK (meal_period IN ('breakfast', 'lunch', 'dinner'));

ALTER TABLE public.meal_transactions 
    ADD CONSTRAINT meal_transactions_meal_period_check CHECK (meal_period IN ('breakfast', 'lunch', 'dinner', 'adjustment'));

-- 2. Add meal_plan_type column to profiles and subscriptions
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS meal_plan_type TEXT NOT NULL DEFAULT 'lunch_dinner' 
    CHECK (meal_plan_type IN ('lunch_dinner', 'breakfast_lunch', 'breakfast_dinner', 'any_two'));

ALTER TABLE public.subscriptions 
    ADD COLUMN IF NOT EXISTS meal_plan_type TEXT NOT NULL DEFAULT 'lunch_dinner' 
    CHECK (meal_plan_type IN ('lunch_dinner', 'breakfast_lunch', 'breakfast_dinner', 'any_two'));

-- 3. Upsert 2-Meal Plan options into subscription_plans table
INSERT INTO public.subscription_plans (id, name, price_paise, meal_allowance, validity_days, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Monthly Lunch & Dinner (दोपहर + रात)', 280000, 54, 30, TRUE),
    ('00000000-0000-0000-0000-000000000002', 'Monthly Breakfast & Lunch (नाश्ता + दोपहर)', 280000, 54, 30, TRUE),
    ('00000000-0000-0000-0000-000000000003', 'Monthly Breakfast & Dinner (नाश्ता + रात)', 280000, 54, 30, TRUE),
    ('00000000-0000-0000-0000-000000000004', 'Monthly Flexible Any 2 (लचीला कोई भी 2 समय)', 280000, 54, 30, TRUE)
ON CONFLICT (id) DO UPDATE 
SET 
    name = EXCLUDED.name,
    price_paise = EXCLUDED.price_paise,
    meal_allowance = EXCLUDED.meal_allowance,
    validity_days = EXCLUDED.validity_days,
    is_active = EXCLUDED.is_active;

-- 4. Update check_in_member_meal Stored Procedure with 2-meal slot & duplicate validation
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

    -- 4. Enforce 2-Meal Plan Slot Permissions
    IF v_plan_type = 'lunch_dinner' AND p_meal_period = 'breakfast' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'PLAN_NOT_PERMITTED',
            'message', 'Your plan allows Lunch & Dinner only (दोपहर और रात). Breakfast (नाश्ता) is not permitted.',
            'member_name', v_member.full_name,
            'member_number', v_member.member_number,
            'remaining_meals', v_remaining
        );
    ELSIF v_plan_type = 'breakfast_lunch' AND p_meal_period = 'dinner' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'PLAN_NOT_PERMITTED',
            'message', 'Your plan allows Breakfast & Lunch only (नाश्ता और दोपहर). Dinner (रात का खाना) is not permitted.',
            'member_name', v_member.full_name,
            'member_number', v_member.member_number,
            'remaining_meals', v_remaining
        );
    ELSIF v_plan_type = 'breakfast_dinner' AND p_meal_period = 'lunch' THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'PLAN_NOT_PERMITTED',
            'message', 'Your plan allows Breakfast & Dinner only (नाश्ता और रात). Lunch (दोपहर का खाना) is not permitted.',
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

    -- 5. Check Duplicate Policy: 1 check-in per member per meal slot per date
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

    -- 6. Deduct 1 Meal Atomically
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
