-- Add commercial job fields to job_requests
ALTER TABLE job_requests ADD COLUMN IF NOT EXISTS frequency text;
ALTER TABLE job_requests ADD COLUMN IF NOT EXISTS min_staff integer;

-- Update job_requests status type to include 'accepted'
-- (status was: open | in_progress | completed | cancelled | expired)
-- The accepted state sits between open (client chooses provider) and
-- in_progress (work underway). Using a separate value avoids
-- ambiguity and lets us filter feeds cleanly.
ALTER TABLE job_requests
  DROP CONSTRAINT IF EXISTS job_requests_status_check;

ALTER TABLE job_requests
  ADD CONSTRAINT job_requests_status_check
  CHECK (status IN ('open', 'accepted', 'in_progress', 'completed', 'cancelled', 'expired'));
