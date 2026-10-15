-- Add PIN / Access Code and Phone Verified status to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pin_code TEXT DEFAULT '1234',
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;

-- Set default PIN for existing members
UPDATE public.profiles SET pin_code = '1234' WHERE pin_code IS NULL;
