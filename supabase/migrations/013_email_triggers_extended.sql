-- ─── Migration 013: Extended email triggers ──────────────────────────────────
-- Adds triggers for:
--   1. job_requests.status → 'completed' → email client + provider
--   2. job_applications.status → 'rejected' → email losing provider

-- ─── Trigger: job completed ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION trg_email_job_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    PERFORM send_email_notification(jsonb_build_object(
      'type', 'job_completed',
      'data', to_jsonb(NEW)
    ));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS email_on_job_completed ON job_requests;
CREATE TRIGGER email_on_job_completed
  AFTER UPDATE ON job_requests
  FOR EACH ROW
  EXECUTE FUNCTION trg_email_job_completed();

-- ─── Trigger: offer rejected → email losing provider ─────────────────────────

CREATE OR REPLACE FUNCTION trg_email_offer_rejected()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    PERFORM send_email_notification(jsonb_build_object(
      'type', 'offer_rejected',
      'data', to_jsonb(NEW)
    ));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS email_on_offer_rejected ON job_applications;
CREATE TRIGGER email_on_offer_rejected
  AFTER UPDATE ON job_applications
  FOR EACH ROW
  EXECUTE FUNCTION trg_email_offer_rejected();

-- ─── pg_cron: check-reminders hourly ─────────────────────────────────────────
-- Run this manually after deploying the check-reminders edge function:
--
-- SELECT cron.schedule(
--   'check-reminders-hourly',
--   '0 * * * *',
--   $$
--     SELECT net.http_post(
--       url     := current_setting('app.supabase_url') || '/functions/v1/check-reminders',
--       headers := jsonb_build_object(
--         'Content-Type',  'application/json',
--         'Authorization', 'Bearer ' || current_setting('app.service_role_key')
--       ),
--       body    := '{}'
--     )
--   $$
-- );

NOTIFY pgrst, 'reload schema';
