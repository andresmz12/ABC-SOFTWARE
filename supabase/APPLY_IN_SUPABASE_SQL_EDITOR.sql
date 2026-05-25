-- ══════════════════════════════════════════════════════════════════════════════
-- ProVendor · Migrations 012 + 013 + 014 · Consolidated SQL for Supabase SQL Editor
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
-- NOTE: This database does NOT have a "users" table.
-- User identity is stored in: clients, companies, independents (each with user_id = auth.uid())
-- Admin identity is stored in the "admins" table.
-- ══════════════════════════════════════════════════════════════════════════════

-- ─── MIGRATION 014: Admins table + profile table columns ────────────────────

-- Admins table (replaces users WHERE role='admin')
CREATE TABLE IF NOT EXISTS admins (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins_self_read" ON admins;
CREATE POLICY "admins_self_read" ON admins FOR SELECT USING (auth.uid() = id);

-- ── Add missing columns to profile tables ─────────────────────────────────────

-- clients table
ALTER TABLE clients ADD COLUMN IF NOT EXISTS status            TEXT NOT NULL DEFAULT 'active';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS push_token        TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS latitude          DOUBLE PRECISION;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS longitude         DOUBLE PRECISION;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS country           TEXT DEFAULT 'usa';

-- companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS status            TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS push_token        TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS available         BOOLEAN DEFAULT true;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS latitude          DOUBLE PRECISION;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS longitude         DOUBLE PRECISION;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS country           TEXT DEFAULT 'usa';
-- Backfill NULLs for rows that existed before the column was added
UPDATE companies SET available = true WHERE available IS NULL;

-- independents table
ALTER TABLE independents ADD COLUMN IF NOT EXISTS status            TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE independents ADD COLUMN IF NOT EXISTS push_token        TEXT;
ALTER TABLE independents ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en';
ALTER TABLE independents ADD COLUMN IF NOT EXISTS available         BOOLEAN DEFAULT true;
ALTER TABLE independents ADD COLUMN IF NOT EXISTS latitude          DOUBLE PRECISION;
ALTER TABLE independents ADD COLUMN IF NOT EXISTS longitude         DOUBLE PRECISION;
ALTER TABLE independents ADD COLUMN IF NOT EXISTS country           TEXT DEFAULT 'usa';
-- Backfill NULLs for rows that existed before the column was added
UPDATE independents SET available = true WHERE available IS NULL;

-- ── is_admin() helper — uses admins table (NOT users) ─────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
$$;


-- ─── MIGRATION 012: Chats, Reviews, Job Photos, Geolocation ──────────────────

-- ── Chats table (admin ↔ user support chat) ───────────────────────────────────
-- FKs reference auth.users(id) since there is no public users table
CREATE TABLE IF NOT EXISTS chats (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type   TEXT NOT NULL DEFAULT 'client' CHECK (user_type IN ('client','company','independent')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Add missing columns (safe to run even if columns already exist)
ALTER TABLE chats ADD COLUMN IF NOT EXISTS resolved   BOOLEAN DEFAULT false;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS user_type  TEXT NOT NULL DEFAULT 'client';
-- Apply the check constraint only if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chats_user_type_check' AND conrelid = 'chats'::regclass
  ) THEN
    ALTER TABLE chats ADD CONSTRAINT chats_user_type_check
      CHECK (user_type IN ('client','company','independent'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS chats_user_id_idx  ON chats(user_id);
CREATE INDEX IF NOT EXISTS chats_admin_id_idx ON chats(admin_id);

-- ── Messages table ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id     UUID REFERENCES chats(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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
  client_id   UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Chats: split into explicit per-operation policies to prevent RLS insert errors
DROP POLICY IF EXISTS "chats_user_access"  ON chats;
DROP POLICY IF EXISTS "chats_select"       ON chats;
DROP POLICY IF EXISTS "chats_insert"       ON chats;
DROP POLICY IF EXISTS "chats_update"       ON chats;
DROP POLICY IF EXISTS "chats_delete"       ON chats;

-- SELECT: user sees their own chat; admin sees all
CREATE POLICY "chats_select" ON chats
  FOR SELECT USING (
    auth.uid() = user_id
    OR is_admin()
  );

-- INSERT: user inserts their own chat (user_id = auth.uid()); admin inserts for any user
CREATE POLICY "chats_insert" ON chats
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR is_admin()
  );

-- UPDATE: user can update their own; admin can update any
CREATE POLICY "chats_update" ON chats
  FOR UPDATE USING (
    auth.uid() = user_id
    OR is_admin()
  );

-- DELETE: only admin
CREATE POLICY "chats_delete" ON chats
  FOR DELETE USING (is_admin());

-- Messages: accessible via parent chat access
DROP POLICY IF EXISTS "messages_access"  ON messages;
DROP POLICY IF EXISTS "messages_select"  ON messages;
DROP POLICY IF EXISTS "messages_insert"  ON messages;
DROP POLICY IF EXISTS "messages_update"  ON messages;

CREATE POLICY "messages_select" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (c.user_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "messages_insert" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (c.user_id = auth.uid() OR is_admin())
    )
  );

CREATE POLICY "messages_update" ON messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM chats c
      WHERE c.id = messages.chat_id
        AND (c.user_id = auth.uid() OR is_admin())
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
-- STEP 1 · Add admin user(s)
--   For each admin, insert their auth.uid() into the admins table:
--
--     INSERT INTO admins (id, email)
--     VALUES ('<admin-auth-uid>', 'admin@yourapp.com')
--     ON CONFLICT (id) DO NOTHING;
--
--   Find the UUID in: Authentication → Users → click the admin user → copy User UID
--
-- STEP 2 · Create Storage Bucket for job photos
--   Go to: Storage → New bucket
--   Name:  job-photos
--   Public: YES (so photo URLs work in the app)
--
-- STEP 3 · Set DB config for email triggers
--   Run this in a new SQL Editor query:
--
--     ALTER DATABASE postgres SET "app.supabase_url"     = 'https://pnmxsonnfdgbwtvkwfhj.supabase.co';
--     ALTER DATABASE postgres SET "app.service_role_key" = '<your-service-role-key>';
--     SELECT pg_reload_conf();
--
--   (Get the service_role_key from: Project Settings → API → service_role)
--
-- STEP 4 · Set Supabase Secrets for edge functions
--   In Supabase Dashboard: Settings → Edge Functions → Secrets
--   Add:
--     SENDGRID_API_KEY   = SG.your_actual_key
--     FROM_EMAIL         = noreply@yourapp.com
--
-- STEP 5 · Deploy edge functions (run locally with Supabase CLI)
--   supabase functions deploy send-email
--   supabase functions deploy check-reminders
--
-- STEP 6 · Schedule check-reminders (hourly) — run in SQL Editor AFTER deploying:
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
