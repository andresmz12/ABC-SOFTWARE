-- Migration 033: Allow providers to upload before/after photos for their assigned jobs
-- Fixes: 500 error when provider calls Start Job and uploads a photo.
-- The old "job_photos_client_upload" policy required the first path segment to be
-- the uploader's own user-id (format: {uid}/{job_id}/...).  Provider uploads now
-- use the format {job_id}/before/{filename}, so a separate policy is needed.

-- Drop previous provider upload policy if it exists from a manual fix attempt
DROP POLICY IF EXISTS "job_photos_provider_upload" ON storage.objects;

CREATE POLICY "job_photos_provider_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'job-photos'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM job_requests jr
      WHERE jr.id::text = (storage.foldername(name))[1]
        AND jr.provider_id = auth.uid()
        AND jr.status IN ('accepted', 'in_progress')
    )
  );

-- Also allow providers to overwrite (upsert) by adding an UPDATE policy on the same path
DROP POLICY IF EXISTS "job_photos_provider_update" ON storage.objects;

CREATE POLICY "job_photos_provider_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'job-photos'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM job_requests jr
      WHERE jr.id::text = (storage.foldername(name))[1]
        AND jr.provider_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
