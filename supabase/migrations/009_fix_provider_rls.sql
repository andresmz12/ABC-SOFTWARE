-- Migration 009: fix provider RLS for job_requests
-- Drop the old policy that joined on service_areas.city (caused false negatives
-- when providers had no city set) and replace with a simpler state-only check.

DROP POLICY IF EXISTS "job_requests_provider_read" ON job_requests;

CREATE POLICY "job_requests_provider_read" ON job_requests
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM companies WHERE user_id = auth.uid() AND status = 'approved'
    UNION ALL
    SELECT 1 FROM independents WHERE user_id = auth.uid() AND status = 'approved'
  )
);
