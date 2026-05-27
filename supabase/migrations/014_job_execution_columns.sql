-- Add job execution tracking columns to job_requests
ALTER TABLE job_requests
  ADD COLUMN IF NOT EXISTS start_photo_url      TEXT,
  ADD COLUMN IF NOT EXISTS completion_photo_url  TEXT,
  ADD COLUMN IF NOT EXISTS started_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at          TIMESTAMPTZ;

-- Reviews RLS:
--   SELECT: public read (needed for avg-rating display in browse-providers and analytics).
--           Individual review content is hidden in the UI for non-admins; the DB only
--           enforces write-access (who can submit a review).
--   INSERT: only the client who owns the job can submit a review.
DROP POLICY IF EXISTS "reviews_read"        ON reviews;
DROP POLICY IF EXISTS "reviews_admin_read"  ON reviews;

CREATE POLICY "reviews_read" ON reviews
  FOR SELECT USING (true);

-- Clients can only insert their own review
DROP POLICY IF EXISTS "reviews_insert" ON reviews;
CREATE POLICY "reviews_insert" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = client_id);

NOTIFY pgrst, 'reload schema';
