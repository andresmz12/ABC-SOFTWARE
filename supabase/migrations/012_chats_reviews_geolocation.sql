-- ─── Migration 012: Chats, Reviews, Job Photos, Geolocation ────────────────────
-- Covers FASE 2 (chat), FASE 3 (reviews, photos, job status), FASE 4 (geo)

-- ── Push token on users (if not already added via notification lib) ────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token text;

-- ── Geolocation on users ───────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude  double precision;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude double precision;

-- ── Chats ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chats (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  user_id     uuid REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chats_user_id_idx  ON chats(user_id);
CREATE INDEX IF NOT EXISTS chats_admin_id_idx ON chats(admin_id);

-- ── Messages ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id     uuid REFERENCES chats(id) ON DELETE CASCADE,
  sender_id   uuid REFERENCES users(id) ON DELETE CASCADE,
  content     text NOT NULL,
  read        boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_chat_id_idx ON messages(chat_id);
CREATE INDEX IF NOT EXISTS messages_sender_id_idx ON messages(sender_id);

-- ── Reviews ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id      uuid REFERENCES job_requests(id) ON DELETE CASCADE,
  client_id   uuid REFERENCES users(id) ON DELETE CASCADE,
  provider_id uuid REFERENCES users(id) ON DELETE CASCADE,
  rating      integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment     text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(job_id, client_id)
);

CREATE INDEX IF NOT EXISTS reviews_provider_id_idx ON reviews(provider_id);
CREATE INDEX IF NOT EXISTS reviews_job_id_idx      ON reviews(job_id);

-- ── Job photos (before / after) ───────────────────────────────────────────────
ALTER TABLE job_requests ADD COLUMN IF NOT EXISTS photos_before text[];
ALTER TABLE job_requests ADD COLUMN IF NOT EXISTS photos_after  text[];

-- ── Job status: ensure 'in_progress' is valid ─────────────────────────────────
-- (constraint already updated in migration 011; this is idempotent)
ALTER TABLE job_requests
  DROP CONSTRAINT IF EXISTS job_requests_status_check;

ALTER TABLE job_requests
  ADD CONSTRAINT job_requests_status_check
  CHECK (status IN ('open','accepted','in_progress','completed','cancelled','expired'));

-- ── Row-Level Security ────────────────────────────────────────────────────────

-- Chats: user can see their own chat; admin can see all
ALTER TABLE chats  ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chats_user_access"  ON chats;
CREATE POLICY "chats_user_access" ON chats
  FOR ALL USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
  );

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

DROP POLICY IF EXISTS "reviews_read" ON reviews;
CREATE POLICY "reviews_read" ON reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "reviews_insert" ON reviews;
CREATE POLICY "reviews_insert" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = client_id);

-- ── Enable Realtime ───────────────────────────────────────────────────────────
-- Run these manually in Supabase Dashboard > Database > Replication
-- or via: ALTER PUBLICATION supabase_realtime ADD TABLE chats, messages;

-- ── Notify schema reload ──────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
