-- Migration 026: Schema reconciliation + admins RLS
-- Brings the migration files in line with the live database, which had been
-- edited manually in the dashboard (admins table, clients.email, budget_max_*).
-- Everything here is idempotent and safe to re-run.

-- ── 1. admins table: guarantee table + all columns exist ─────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS display_name   TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS invited_by     UUID REFERENCES auth.users(id);

-- Ensure at least one super admin exists (oldest admin) if none is set yet.
UPDATE admins
SET is_super_admin = TRUE
WHERE id = (SELECT id FROM admins ORDER BY created_at ASC LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM admins WHERE is_super_admin = TRUE);

-- ── 2. admins RLS: lock the table down ───────────────────────────────────────
-- Without this, RLS was off and any authenticated user could read/write admins.
-- Reads: an admin can read the admins table (needed for the Team screen and
-- for getUserProfile). Writes are performed exclusively by the create-admin /
-- delete-admin edge functions using the service role, which bypasses RLS — so
-- we intentionally do NOT grant INSERT/UPDATE/DELETE to normal clients.
--
-- IMPORTANT: the read policy uses is_admin() (SECURITY DEFINER) rather than an
-- inline `EXISTS (SELECT FROM admins ...)`. A self-referential subquery in a
-- policy ON the admins table would recurse infinitely; is_admin() bypasses RLS.
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_self_read"  ON admins;
DROP POLICY IF EXISTS "admins_admin_read" ON admins;

-- Any admin can read the full admins list (and their own row for login lookup).
CREATE POLICY "admins_admin_read" ON admins
  FOR SELECT USING (is_admin());

-- ── 3. clients.email: column + backfill from the users bridge table ──────────
ALTER TABLE clients ADD COLUMN IF NOT EXISTS email TEXT;
UPDATE clients c
SET email = u.email
FROM users u
WHERE u.id = c.user_id
  AND (c.email IS NULL OR c.email = '');

-- ── 4. job_requests budget ceiling columns (used by post-job & admin new-job) ─
ALTER TABLE job_requests ADD COLUMN IF NOT EXISTS budget_max_usd numeric(10,2);
ALTER TABLE job_requests ADD COLUMN IF NOT EXISTS budget_max_cop numeric(14,2);

NOTIFY pgrst, 'reload schema';
