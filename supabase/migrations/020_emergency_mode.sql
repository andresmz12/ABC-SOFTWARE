-- Add emergency flag and job execution columns (safe to re-run)
ALTER TABLE job_requests ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN DEFAULT false;
ALTER TABLE job_requests ADD COLUMN IF NOT EXISTS start_photo_url TEXT;
ALTER TABLE job_requests ADD COLUMN IF NOT EXISTS completion_photo_url TEXT;
ALTER TABLE job_requests ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE job_requests ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

NOTIFY pgrst, 'reload schema';
