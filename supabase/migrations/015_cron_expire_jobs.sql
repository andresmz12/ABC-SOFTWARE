-- Enable pg_cron and pg_net extensions (required for scheduled HTTP calls)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the expire-jobs edge function to run every hour.
-- Replace <PROJECT_REF> and <ANON_KEY> with actual Supabase project values
-- in the Supabase Dashboard > SQL Editor before applying.
--
-- To apply manually: run the SELECT cron.schedule(...) line below in the
-- Supabase SQL editor after substituting your project ref and anon key.

SELECT cron.schedule(
  'expire-jobs-hourly',
  '0 * * * *',   -- every hour at :00
  $$
    SELECT net.http_post(
      url    := 'https://<PROJECT_REF>.supabase.co/functions/v1/expire-jobs',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer <ANON_KEY>"}'::jsonb,
      body   := '{}'::jsonb
    );
  $$
);

-- Alternatively, use a pure-SQL fallback that runs without the edge function.
-- This marks expired open jobs directly in the DB (no push notifications).
CREATE OR REPLACE FUNCTION expire_open_jobs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE job_requests
  SET status = 'expired'
  WHERE status = 'open'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
$$;

-- Schedule the SQL fallback every hour as well (safe to have both;
-- the edge function version also handles push notifications).
SELECT cron.schedule(
  'expire-jobs-sql-hourly',
  '5 * * * *',   -- every hour at :05 (offset to avoid collision)
  'SELECT expire_open_jobs()'
);
