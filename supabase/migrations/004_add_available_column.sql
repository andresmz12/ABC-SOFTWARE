-- Add 'available' column to users table for provider availability toggle.
-- Run this migration and then reload the PostgREST schema cache.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS available boolean NOT NULL DEFAULT false;

-- Reload PostgREST schema cache so the new column is recognized immediately:
NOTIFY pgrst, 'reload schema';
