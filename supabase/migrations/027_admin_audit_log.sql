-- Migration 027: Admin audit log
-- Tracks every admin action (assign, reassign, cancel, create) for accountability.

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id    uuid        REFERENCES admins(id) ON DELETE SET NULL,
  action      text        NOT NULL,
  target_type text,
  target_id   uuid,
  metadata    jsonb       DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_admin   ON admin_audit_log(admin_id);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_admin_read"   ON admin_audit_log;
DROP POLICY IF EXISTS "audit_admin_insert" ON admin_audit_log;

-- Any admin can read the full log.
CREATE POLICY "audit_admin_read" ON admin_audit_log
  FOR SELECT USING (is_admin());

-- Admins may only insert rows attributed to themselves.
CREATE POLICY "audit_admin_insert" ON admin_audit_log
  FOR INSERT WITH CHECK (is_admin() AND admin_id = auth.uid());

NOTIFY pgrst, 'reload schema';
