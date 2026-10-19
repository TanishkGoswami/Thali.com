-- ==============================================================================
-- Thali.com — Migration 006: Mess Closures & Bot Subscribers
-- Supports:
-- 1. mess_closures table for tracking mess off dates, meal periods, and reasons
-- 2. bot_subscribers table for tracking all telegram users subscribed to notifications
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.mess_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_date DATE NOT NULL,
    meal_period TEXT NOT NULL CHECK (meal_period IN ('all_day', 'breakfast', 'lunch', 'dinner')),
    reason TEXT NOT NULL,
    closed_by TEXT DEFAULT 'Admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_closure_date_period UNIQUE (service_date, meal_period)
);

CREATE INDEX IF NOT EXISTS idx_mess_closures_date ON public.mess_closures(service_date);

ALTER TABLE public.mess_closures ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'mess_closures' AND policyname = 'Allow select mess_closures'
    ) THEN
        CREATE POLICY "Allow select mess_closures" ON public.mess_closures FOR SELECT USING (TRUE);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'mess_closures' AND policyname = 'Allow insert mess_closures'
    ) THEN
        CREATE POLICY "Allow insert mess_closures" ON public.mess_closures FOR INSERT WITH CHECK (TRUE);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'mess_closures' AND policyname = 'Allow update mess_closures'
    ) THEN
        CREATE POLICY "Allow update mess_closures" ON public.mess_closures FOR UPDATE USING (TRUE);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'mess_closures' AND policyname = 'Allow delete mess_closures'
    ) THEN
        CREATE POLICY "Allow delete mess_closures" ON public.mess_closures FOR DELETE USING (TRUE);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.bot_subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id TEXT NOT NULL UNIQUE,
    username TEXT,
    first_name TEXT,
    bot_type TEXT NOT NULL DEFAULT 'member', -- 'member' or 'admin'
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_subscribers_chat_id ON public.bot_subscribers(chat_id);

ALTER TABLE public.bot_subscribers ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'bot_subscribers' AND policyname = 'Allow all bot_subscribers'
    ) THEN
        CREATE POLICY "Allow all bot_subscribers" ON public.bot_subscribers FOR ALL USING (TRUE);
    END IF;
END $$;
