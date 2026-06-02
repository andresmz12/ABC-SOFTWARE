-- Migration 034: Fix provider photo upload storage policy
--
-- Problems in 033:
--   1. INSERT policy referenced `jr.provider_id` which does NOT exist on
--      job_requests (provider is tracked via job_applications/work_orders).
--      This caused a PostgreSQL column-not-found 500 on every upload.
--   2. The UPDATE policy was the wrong SQL operation: Supabase storage
--      upsert (upsert:true) is implemented as DELETE + INSERT internally,
--      never a SQL UPDATE. The UPDATE policy was dead code.
--      What's needed for upsert overwrites is a DELETE policy.

-- Fix 1: Recreate INSERT policy — join through job_applications instead
DROP POLICY IF EXISTS "job_photos_provider_upload" ON storage.objects;

CREATE POLICY "job_photos_provider_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'job-photos'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1
      FROM job_requests  jr
      JOIN job_applications ja ON ja.job_request_id = jr.id
      WHERE jr.id::text   = (storage.foldername(name))[1]
        AND ja.provider_id = auth.uid()
        AND ja.status      = 'accepted'
        AND jr.status      IN ('accepted', 'in_progress')
    )
  );

-- Fix 2: Drop the UPDATE policy (wrong operation for upsert path)
DROP POLICY IF EXISTS "job_photos_provider_update" ON storage.objects;

-- Fix 3: Add DELETE policy so upsert overwrites (DELETE then re-INSERT) succeed
DROP POLICY IF EXISTS "job_photos_provider_delete" ON storage.objects;

CREATE POLICY "job_photos_provider_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'job-photos'
    AND auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1
      FROM job_requests  jr
      JOIN job_applications ja ON ja.job_request_id = jr.id
      WHERE jr.id::text   = (storage.foldername(name))[1]
        AND ja.provider_id = auth.uid()
        AND ja.status      = 'accepted'
    )
  );

NOTIFY pgrst, 'reload schema';
