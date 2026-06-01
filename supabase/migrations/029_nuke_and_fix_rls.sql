-- Migration 029: Nuclear reset of job_requests + job_applications RLS
--
-- Drops every known policy on these tables (by every name used across
-- all migration files) and rebuilds them cleanly with no circular
-- dependencies.

-- ── 1. Drop ALL known policies on job_requests ────────────────────────────────
DROP POLICY IF EXISTS "job_requests_client_crud"            ON job_requests;
DROP POLICY IF EXISTS "job_requests_client_all"             ON job_requests;
DROP POLICY IF EXISTS "job_requests_client_own"             ON job_requests;
DROP POLICY IF EXISTS "job_requests_approved_provider_read" ON job_requests;
DROP POLICY IF EXISTS "job_requests_provider_read"          ON job_requests;
DROP POLICY IF EXISTS "job_requests_applicant_read"         ON job_requests;
DROP POLICY IF EXISTS "admin_all_job_requests"              ON job_requests;
DROP POLICY IF EXISTS "job_requests_admin_all"              ON job_requests;

-- ── 2. Drop ALL known policies on job_applications ───────────────────────────
DROP POLICY IF EXISTS "applications_provider_crud"  ON job_applications;
DROP POLICY IF EXISTS "applications_provider_all"   ON job_applications;
DROP POLICY IF EXISTS "applications_client_read"    ON job_applications;
DROP POLICY IF EXISTS "admin_all_applications"      ON job_applications;
DROP POLICY IF EXISTS "applications_admin_all"      ON job_applications;

-- ── 3. SECURITY DEFINER helper (bypasses RLS to break cycles) ────────────────
CREATE OR REPLACE FUNCTION job_owned_by_current_user(p_job_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM job_requests WHERE id = p_job_id AND client_id = auth.uid()
  );
$$;

-- ── 4. Recreate job_requests policies (no self-references) ───────────────────

-- Clients see/manage their own jobs
CREATE POLICY "job_requests_client_all" ON job_requests
  FOR ALL USING (client_id = auth.uid());

-- Approved providers see open jobs (checks providers tables, not job_requests)
CREATE POLICY "job_requests_provider_read" ON job_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies    WHERE user_id = auth.uid() AND status = 'approved'
      UNION ALL
      SELECT 1 FROM independents WHERE user_id = auth.uid() AND status = 'approved'
    )
  );

-- Providers see jobs they already applied to (safe: job_applications policies
-- no longer call back into job_requests thanks to SECURITY DEFINER helper)
CREATE POLICY "job_requests_applicant_read" ON job_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM job_applications ja
      WHERE ja.job_request_id = job_requests.id
        AND ja.provider_id    = auth.uid()
    )
  );

-- Admins see everything
CREATE POLICY "job_requests_admin_all" ON job_requests
  FOR ALL USING (is_admin());

-- ── 5. Recreate job_applications policies ────────────────────────────────────

-- Providers manage their own applications
CREATE POLICY "applications_provider_all" ON job_applications
  FOR ALL USING (provider_id = auth.uid());

-- Clients read applications on their jobs — uses SECURITY DEFINER to avoid
-- re-entering job_requests RLS evaluation
CREATE POLICY "applications_client_read" ON job_applications
  FOR SELECT USING (job_owned_by_current_user(job_request_id));

-- Admins see everything
CREATE POLICY "applications_admin_all" ON job_applications
  FOR ALL USING (is_admin());

-- ── 6. Ensure work_orders has an admin policy ─────────────────────────────────
DROP POLICY IF EXISTS "wo_admin" ON work_orders;
CREATE POLICY "wo_admin" ON work_orders FOR ALL USING (is_admin());

NOTIFY pgrst, 'reload schema';
