-- Migration 032: Allow provider to UPDATE job_requests they are assigned to
--
-- Problem: providers (companies/independents) have no UPDATE policy on
-- job_requests, so setting status = 'in_progress' or 'completed' returns
-- 403 / empty data with no rows affected.
--
-- Fix: grant UPDATE when the provider either has an accepted job_application
-- OR a work_order pointing to the same job_request.

DROP POLICY IF EXISTS "job_requests_provider_update" ON job_requests;

CREATE POLICY "job_requests_provider_update" ON job_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM work_orders
      WHERE job_request_id = job_requests.id
        AND provider_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM job_applications
      WHERE job_request_id = job_requests.id
        AND provider_id = auth.uid()
        AND status = 'accepted'
    )
  );

NOTIFY pgrst, 'reload schema';
