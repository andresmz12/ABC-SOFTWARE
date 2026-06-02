-- Migration 035: Add WITH CHECK to provider UPDATE policy on job_requests
--
-- Problem in 032: the policy had USING but no WITH CHECK.
-- In PostgreSQL, FOR UPDATE without WITH CHECK means the USING predicate is
-- re-evaluated on the post-update row, but there is no constraint on which
-- column values may be written. A provider could set status to any value
-- ('open', 'cancelled', 'accepted', etc.) as long as they pass USING.
--
-- Fix: restrict writable status values to 'in_progress' and 'completed'.

DROP POLICY IF EXISTS "job_requests_provider_update" ON job_requests;

CREATE POLICY "job_requests_provider_update" ON job_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM work_orders
      WHERE job_request_id = job_requests.id
        AND provider_id    = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM job_applications
      WHERE job_request_id = job_requests.id
        AND provider_id    = auth.uid()
        AND status         = 'accepted'
    )
  )
  WITH CHECK (
    status IN ('in_progress', 'completed')
  );

NOTIFY pgrst, 'reload schema';
