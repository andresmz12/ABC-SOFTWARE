-- ══════════════════════════════════════════════════════════════════════════════
-- ProVendor · Migrations 012 + 013 · Consolidated SQL for Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════════
--
-- HOW TO APPLY:
--   1. Go to https://pnmxsonnfdgbwtvkwfhj.supabase.co
--   2. Left sidebar → SQL Editor → New query
--   3. Paste this entire file and click "Run"
--   4. After success, continue with the MANUAL STEPS at the bottom.
--
-- SAFE TO RE-RUN: all statements use IF NOT EXISTS / CREATE OR REPLACE / DROP IF EXISTS
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── MIGRATION 012: Chats, Reviews, Job Photos, Geolocation ──────────────────

-- Push token (for Expo push notifications)
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Geolocation columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude  DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- ── Chats table (admin ↔ user support chat) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS chats (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chats_user_id_idx  ON chats(user_id);
CREATE INDEX IF NOT EXISTS chats_admin_id_idx ON chats(admin_id);

-- ── Messages table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id     UUID REFERENCES chats(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_chat_id_idx   ON messages(chat_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages(sender_id);

-- ── Reviews table (1-5 stars, one per job+client) ─────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      UUID REFERENCES job_requests(id) ON DELETE CASCADE,
  client_id   UUID REFERENCES users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating      INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id, client_id)
);

CREATE INDEX IF NOT EXISTS reviews_provider_id_idx ON reviews(provider_id);
CREATE INDEX IF NOT EXISTS reviews_job_id_idx      ON reviews(job_id);

-- ── Job photos (before / after) ───────────────────────────────────────────────
ALTER TABLE job_requests ADD COLUMN IF NOT EXISTS photos_before TEXT[];
ALTER TABLE job_requests ADD COLUMN IF NOT EXISTS photos_after  TEXT[];

-- ── Job status constraint: ensure all valid values are allowed ────────────────
ALTER TABLE job_requests DROP CONSTRAINT IF EXISTS job_requests_status_check;
ALTER TABLE job_requests
  ADD CONSTRAINT job_requests_status_check
  CHECK (status IN ('open','accepted','in_progress','completed','cancelled','expired'));

-- ── Row-Level Security ────────────────────────────────────────────────────────
ALTER TABLE chats    ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews  ENABLE ROW LEVEL SECURITY;

-- Chats: user sees their own chat; admin sees all
DROP POLICY IF EXISTS "chats_user_access" ON chats;
CREATE POLICY "chats_user_access" ON chats
  FOR ALL USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

-- Messages: accessible via parent chat access
DROP POLICY IF EXISTS "messages_access" ON messages;
CREATE POLICY "messages_access" ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (
          c.user_id = auth.uid()
          OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
        )
    )
  );

-- Reviews: anyone can read; only the client can insert their own review
DROP POLICY IF EXISTS "reviews_read"   ON reviews;
DROP POLICY IF EXISTS "reviews_insert" ON reviews;
CREATE POLICY "reviews_read"   ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert" ON reviews FOR INSERT WITH CHECK (auth.uid() = client_id);

-- ── Enable Realtime on chat tables ────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE chats;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;


-- ─── MIGRATION 013: Extended email triggers ───────────────────────────────────

-- Trigger: job_requests.status → 'completed' → email client + provider
CREATE OR REPLACE FUNCTION trg_email_job_completed()
RETURNS TRIGGER
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

-- Trigger: job_applications.status → 'rejected' → email losing provider
CREATE OR REPLACE FUNCTION trg_email_offer_rejected()
RETURNS TRIGGER
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

-- ── Schema reload ─────────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════════════
-- ✅ DONE — After running the SQL above, complete these MANUAL STEPS:
-- ══════════════════════════════════════════════════════════════════════════════
--
-- STEP 1 · Create Storage Bucket for job photos
--   Go to: Storage → New bucket
--   Name:  job-photos
--   Public: YES (so photo URLs work in the app)
--
-- STEP 2 · Set DB config for email triggers
--   Run this in a new SQL Editor query:
--
--     ALTER DATABASE postgres SET "app.supabase_url"        = 'https://pnmxsonnfdgbwtvkwfhj.supabase.co';
--     ALTER DATABASE postgres SET "app.service_role_key"    = '<your-service-role-key>';
--     SELECT pg_reload_conf();
--
--   (Get the service_role_key from: Project Settings → API → service_role)
--
-- STEP 3 · Set Supabase Secrets for edge functions
--   In Supabase Dashboard: Settings → Edge Functions → Secrets
--   Add:
--     SENDGRID_API_KEY   = SG.your_actual_key
--     FROM_EMAIL         = noreply@yourapp.com
--
-- STEP 4 · Deploy edge functions (run locally with Supabase CLI)
--   supabase functions deploy send-email
--   supabase functions deploy check-reminders
--
-- STEP 5 · Schedule check-reminders (hourly) — run in SQL Editor AFTER deploying:
--
--   SELECT cron.schedule(
--     'check-reminders-hourly',
--     '0 * * * *',
--     $$
--       SELECT net.http_post(
--         url     := current_setting('app.supabase_url') || '/functions/v1/check-reminders',
--         headers := jsonb_build_object(
--           'Content-Type',  'application/json',
--           'Authorization', 'Bearer ' || current_setting('app.service_role_key')
--         ),
--         body    := '{}'
--       )
--     $$
--   );
--
-- ══════════════════════════════════════════════════════════════════════════════
