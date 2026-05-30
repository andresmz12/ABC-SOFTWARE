-- Migration 025: Fix admin RLS policies to use the admins table
-- The old policies checked `users where role = 'admin'` but the users table
-- is only an email bridge — actual admins live in the `admins` table.

-- ── 1. Update is_admin() helper ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM admins WHERE id = auth.uid());
$$;

-- ── 2. users table ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_read_all_users" ON users;
CREATE POLICY "admin_read_all_users" ON users FOR SELECT USING (is_admin());

-- ── 3. companies (SELECT → ALL so admins can approve/suspend) ────────────────
DROP POLICY IF EXISTS "admin_read_all_companies" ON companies;
DROP POLICY IF EXISTS "admin_all_companies" ON companies;
CREATE POLICY "admin_all_companies" ON companies FOR ALL USING (is_admin());

-- ── 4. independents (SELECT → ALL) ───────────────────────────────────────────
DROP POLICY IF EXISTS "admin_read_all_independents" ON independents;
DROP POLICY IF EXISTS "admin_all_independents" ON independents;
CREATE POLICY "admin_all_independents" ON independents FOR ALL USING (is_admin());

-- ── 5. clients (SELECT → ALL) ────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_read_all_clients" ON clients;
DROP POLICY IF EXISTS "admin_all_clients" ON clients;
CREATE POLICY "admin_all_clients" ON clients FOR ALL USING (is_admin());

-- ── 6. documents ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_all_documents" ON documents;
CREATE POLICY "admin_all_documents" ON documents FOR ALL USING (is_admin());

-- ── 7. job_requests ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_all_job_requests" ON job_requests;
CREATE POLICY "admin_all_job_requests" ON job_requests FOR ALL USING (is_admin());

-- ── 8. job_applications ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_all_applications" ON job_applications;
CREATE POLICY "admin_all_applications" ON job_applications FOR ALL USING (is_admin());

-- ── 9. payments ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_all_payments" ON payments;
CREATE POLICY "admin_all_payments" ON payments FOR ALL USING (is_admin());

-- ── 10. notifications ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_all_notifications" ON notifications;
CREATE POLICY "admin_all_notifications" ON notifications FOR ALL USING (is_admin());

-- ── 11. disputes (enable RLS + policies) ─────────────────────────────────────
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "disputes_admin_all" ON disputes;
DROP POLICY IF EXISTS "disputes_involved_read" ON disputes;
CREATE POLICY "disputes_admin_all" ON disputes FOR ALL USING (is_admin());
CREATE POLICY "disputes_involved_read" ON disputes FOR SELECT USING (
  opened_by = auth.uid()
  OR EXISTS (SELECT 1 FROM job_requests jr WHERE jr.id = disputes.job_request_id AND jr.client_id = auth.uid())
);
DROP POLICY IF EXISTS "disputes_user_insert" ON disputes;
CREATE POLICY "disputes_user_insert" ON disputes FOR INSERT WITH CHECK (
  opened_by = auth.uid()
);

NOTIFY pgrst, 'reload schema';
