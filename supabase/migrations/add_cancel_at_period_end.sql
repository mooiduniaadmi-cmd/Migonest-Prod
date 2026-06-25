-- Add cancel_at_period_end to profiles table to track subscription cancellation status
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT FALSE;
