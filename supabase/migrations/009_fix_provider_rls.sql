-- Migration 009: fix provider RLS for job_requests
-- Drop the old policy that joined on service_areas.city (caused false negatives
-- when providers had no city set) and replace with a simpler state-only check.

DROP POLICY IF EXISTS "job_requests_provider_read" ON job_requests;

CREATE POLICY "job_requests_provider_read" ON job_requests
FOR SELECT USING (
  auth.uid() IN (
    SELECT id FROM users
    WHERE status = 'approved'
    AND role IN ('company', 'independent')
  )
);
