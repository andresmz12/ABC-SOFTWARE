-- Migration 028: Fix infinite recursion in job_requests RLS
--
-- Root cause: mutual RLS dependency between job_requests and job_applications:
--   job_requests_applicant_read  → SELECT from job_applications
--   applications_client_read     → SELECT from job_requests  (triggers loop)
--
-- Fix: replace applications_client_read with a SECURITY DEFINER function
-- that reads job_requests without activating its RLS policies.

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

DROP POLICY IF EXISTS "applications_client_read" ON job_applications;

CREATE POLICY "applications_client_read" ON job_applications
FOR SELECT USING (
  job_owned_by_current_user(job_request_id)
);

-- Also ensure work_orders are readable by admins (missing from migration 022)
DROP POLICY IF EXISTS "wo_admin" ON work_orders;
CREATE POLICY "wo_admin" ON work_orders FOR ALL USING (is_admin());

NOTIFY pgrst, 'reload schema';
