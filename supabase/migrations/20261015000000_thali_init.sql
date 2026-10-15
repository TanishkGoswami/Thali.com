-- ==============================================================================
-- Thali.com — Initial PostgreSQL Schema Migration
-- Matches DATABASE_SCHEMA.md, BUSINESS_RULES.md, and SECURITY_RLS.md
-- Uses native gen_random_uuid() for standard Supabase/PostgreSQL 13+ compatibility
-- ==============================================================================

-- 1. Profiles Table (Members & Staff)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE, -- linked to auth.users if registered
    member_number TEXT UNIQUE, -- preserved legacy number (e.g. "M-101", "405")
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner_admin', 'receptionist', 'member', 'menu_manager')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    qr_token TEXT UNIQUE, -- opaque random token for member pass
    import_batch_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookup by member number and phone
CREATE INDEX IF NOT EXISTS idx_profiles_member_number ON public.profiles(member_number);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);
CREATE INDEX IF NOT EXISTS idx_profiles_qr_token ON public.profiles(qr_token);

-- 2. Subscription Plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price_paise INTEGER NOT NULL DEFAULT 280000, -- ₹2,800
    meal_allowance INTEGER NOT NULL DEFAULT 54, -- 54 meals
    validity_days INTEGER NOT NULL DEFAULT 30, -- 30 days
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default plan
INSERT INTO public.subscription_plans (id, name, price_paise, meal_allowance, validity_days, is_active)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'Monthly Standard Thali', 280000, 54, 30, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 3. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'queued', 'active', 'expired', 'cancelled', 'refunded')),
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    meals_granted INTEGER NOT NULL DEFAULT 54,
    activated_at TIMESTAMPTZ,
    renewal_of_subscription_id UUID REFERENCES public.subscriptions(id),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_member_id ON public.subscriptions(member_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON public.subscriptions(expires_at);

-- 4. Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE RESTRICT,
    amount_paise INTEGER NOT NULL DEFAULT 280000,
    method TEXT NOT NULL CHECK (method IN ('cash', 'upi_direct', 'gateway')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'refunded', 'partially_refunded')),
    provider TEXT,
    provider_order_id TEXT,
    provider_payment_id TEXT,
    reference_text TEXT,
    verified_by UUID REFERENCES public.profiles(id),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_member_id ON public.payments(member_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON public.payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- 5. Meal Sessions (Daily Lunch & Dinner)
CREATE TABLE IF NOT EXISTS public.meal_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_date DATE NOT NULL DEFAULT CURRENT_DATE,
    meal_period TEXT NOT NULL CHECK (meal_period IN ('lunch', 'dinner')),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('scheduled', 'open', 'closed')),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_session_date_period UNIQUE (service_date, meal_period)
);

CREATE INDEX IF NOT EXISTS idx_meal_sessions_date ON public.meal_sessions(service_date);

-- 6. Meal Transactions (Auditable Ledger)
CREATE TABLE IF NOT EXISTS public.meal_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE RESTRICT,
    meal_session_id UUID REFERENCES public.meal_sessions(id),
    service_date DATE NOT NULL DEFAULT CURRENT_DATE,
    meal_period TEXT NOT NULL CHECK (meal_period IN ('lunch', 'dinner', 'adjustment')),
    transaction_type TEXT NOT NULL DEFAULT 'consumption' CHECK (transaction_type IN ('consumption', 'grant', 'adjustment', 'reversal', 'carry_forward')),
    meal_delta INTEGER NOT NULL DEFAULT -1, -- -1 for consumption, positive for grants
    status TEXT NOT NULL DEFAULT 'accepted' CHECK (status IN ('accepted', 'reversed', 'rejected')),
    source TEXT NOT NULL DEFAULT 'staff_qr' CHECK (source IN ('staff_qr', 'venue_qr', 'manual', 'admin', 'system')),
    idempotency_key TEXT UNIQUE,
    actor_id UUID REFERENCES public.profiles(id),
    reason TEXT,
    reverses_transaction_id UUID REFERENCES public.meal_transactions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meal_transactions_member ON public.meal_transactions(member_id);
CREATE INDEX IF NOT EXISTS idx_meal_transactions_sub ON public.meal_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_meal_transactions_date_period ON public.meal_transactions(service_date, meal_period);

-- 7. Menus & Menu Items
CREATE TABLE IF NOT EXISTS public.menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_date DATE NOT NULL DEFAULT CURRENT_DATE,
    meal_period TEXT NOT NULL CHECK (meal_period IN ('lunch', 'dinner')),
    title TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_menu_date_period UNIQUE (service_date, meal_period)
);

CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'Sabzi' CHECK (category IN ('Dal', 'Sabzi', 'Roti', 'Rice', 'Special', 'Sweet', 'Side')),
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    reason TEXT,
    before_data JSONB,
    after_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ==============================================================================
-- 9. Canonical Helper Function: Get Member Remaining Balance
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_subscription_remaining_meals(p_subscription_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_granted INTEGER;
    v_consumed INTEGER;
BEGIN
    SELECT meals_granted INTO v_granted
    FROM public.subscriptions
    WHERE id = p_subscription_id;

    IF v_granted IS NULL THEN
        RETURN 0;
    END IF;

    SELECT COALESCE(SUM(meal_delta), 0) INTO v_consumed
    FROM public.meal_transactions
    WHERE subscription_id = p_subscription_id
      AND status = 'accepted'
      AND transaction_type IN ('consumption', 'adjustment', 'reversal');

    RETURN GREATEST(0, v_granted + v_consumed);
END;
$$;

-- ==============================================================================
-- 10. Atomic Meal Check-in Function (RPC)
-- Validates eligibility, enforces duplicate policy, deducts 1 meal atomically
-- ==============================================================================
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
    v_transaction_id UUID;
    v_new_balance INTEGER;
BEGIN
    -- 1. Find member by QR token
    SELECT id, member_number, full_name, status
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

    -- 2. Find Active & Verified Subscription
    SELECT id, status, starts_at, expires_at, meals_granted
    INTO v_subscription
    FROM public.subscriptions
    WHERE member_id = v_member.id
      AND status = 'active'
      AND (expires_at IS NULL OR expires_at >= NOW())
    ORDER BY starts_at ASC
    LIMIT 1
    FOR UPDATE; -- Lock row to prevent race conditions

    IF NOT FOUND THEN
        -- Check if queued or pending exists to give accurate feedback
        IF EXISTS (SELECT 1 FROM public.subscriptions WHERE member_id = v_member.id AND status = 'pending') THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'code', 'PAYMENT_PENDING',
                'message', 'Subscription payment is pending verification.'
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

    -- 3. Calculate remaining balance
    v_remaining := public.get_subscription_remaining_meals(v_subscription.id);
    IF v_remaining <= 0 THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'code', 'ZERO_BALANCE',
            'message', 'No meals remaining in current subscription.'
        );
    END IF;

    -- 4. Check Duplicate Policy: 1 lunch & 1 dinner per member per date
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
            'remaining_meals', v_remaining
        );
    END IF;

    -- 5. Deduct 1 Meal Atomically
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
        'timestamp', NOW()
    );
END;
$$;

-- ==============================================================================
-- 11. Row Level Security (RLS) Policies
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Allow public read access to profiles"
ON public.profiles FOR SELECT USING (TRUE);

CREATE POLICY "Allow insert and update to profiles"
ON public.profiles FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Subscription Plans
CREATE POLICY "Allow public read to active subscription plans"
ON public.subscription_plans FOR SELECT USING (is_active = TRUE);

-- Subscriptions
CREATE POLICY "Allow read to subscriptions"
ON public.subscriptions FOR SELECT USING (TRUE);

CREATE POLICY "Allow manage subscriptions"
ON public.subscriptions FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Menus & Items
CREATE POLICY "Allow public read to menus"
ON public.menus FOR SELECT USING (TRUE);

CREATE POLICY "Allow manage menus"
ON public.menus FOR ALL USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Allow public read to menu items"
ON public.menu_items FOR SELECT USING (TRUE);

CREATE POLICY "Allow manage menu items"
ON public.menu_items FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Meal Transactions
CREATE POLICY "Allow read to meal transactions"
ON public.meal_transactions FOR SELECT USING (TRUE);

CREATE POLICY "Allow insert meal transactions"
ON public.meal_transactions FOR INSERT WITH CHECK (TRUE);

-- Meal Sessions
CREATE POLICY "Allow public read to meal sessions"
ON public.meal_sessions FOR SELECT USING (TRUE);

CREATE POLICY "Allow manage meal sessions"
ON public.meal_sessions FOR ALL USING (TRUE) WITH CHECK (TRUE);

-- Payments
CREATE POLICY "Allow read to payments"
ON public.payments FOR SELECT USING (TRUE);

CREATE POLICY "Allow manage payments"
ON public.payments FOR ALL USING (TRUE) WITH CHECK (TRUE);
