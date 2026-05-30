-- Migration 018: Security hardening
-- Fixes identified in security audit:
--   1. reviews readable by unauthenticated users
--   2. reviews insertable without a completed job
--   3. service_areas public read relies on obsolete users table
--   4. job-photos bucket: no upload path restriction
--   5. provider-documents admin read relies on obsolete users table

-- ─── 1. Reviews: require auth to read ────────────────────────────────────────

DROP POLICY IF EXISTS "reviews_public_read"          ON reviews;
DROP POLICY IF EXISTS "reviews_read"                 ON reviews;
DROP POLICY IF EXISTS "reviews_authenticated_insert" ON reviews;
DROP POLICY IF EXISTS "reviews_insert"               ON reviews;

DROP POLICY IF EXISTS "reviews_authenticated_read" ON reviews;
CREATE POLICY "reviews_authenticated_read" ON reviews
  FOR SELECT USING (auth.role() = 'authenticated');

-- ─── 2. Reviews: only allow insert when the job is completed ─────────────────

DROP POLICY IF EXISTS "reviews_insert_completed_job" ON reviews;
CREATE POLICY "reviews_insert_completed_job" ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() = client_id
    AND EXISTS (
      SELECT 1 FROM job_requests jr
      WHERE jr.id = reviews.job_id
        AND jr.status = 'completed'
        AND jr.client_id = auth.uid()
    )
  );

-- ─── 3. service_areas: replace users-table dependency with is_admin() ────────

DROP POLICY IF EXISTS "service_areas_public_read" ON service_areas;

-- Providers can read their own areas; admins can read all;
-- any authenticated user can read for browse/matching (state/city is not PII)
DROP POLICY IF EXISTS "service_areas_authenticated_read" ON service_areas;
CREATE POLICY "service_areas_authenticated_read" ON service_areas
  FOR SELECT USING (auth.role() = 'authenticated');

-- ─── 4. job-photos: restrict uploads to the owner's folder ───────────────────

DROP POLICY IF EXISTS "job_photos_client_upload" ON storage.objects;

CREATE POLICY "job_photos_client_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'job-photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Restrict read to authenticated users only (was fully public)
DROP POLICY IF EXISTS "job_photos_read" ON storage.objects;
DROP POLICY IF EXISTS "job_photos_authenticated_read" ON storage.objects;

CREATE POLICY "job_photos_authenticated_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'job-photos'
    AND auth.role() = 'authenticated'
  );

-- ─── 5. provider-documents admin read: use is_admin() instead of users table ──

DROP POLICY IF EXISTS "provider_docs_admin_read" ON storage.objects;

CREATE POLICY "provider_docs_admin_read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'provider-documents'
    AND is_admin()
  );

-- ─── 6. documents storage bucket: restrict uploads to owner's folder ──────────
DROP POLICY IF EXISTS "documents_owner_upload" ON storage.objects;
CREATE POLICY "documents_owner_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

NOTIFY pgrst, 'reload schema';
