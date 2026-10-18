-- ==============================================================================
-- Thali.com — Migration 005: Telegram Bot Chat Integration
-- Supports:
-- 1. telegram_chat_id & telegram_username on profiles table
-- 2. Index for instant telegram_chat_id lookup by the bot
-- ==============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_username TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_telegram_chat_id ON public.profiles(telegram_chat_id);
CREATE INDEX IF NOT EXISTS idx_profiles_telegram_username ON public.profiles(telegram_username);
