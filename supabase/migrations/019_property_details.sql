-- Add optional property detail columns to job_requests
-- Residential: bedrooms, bathrooms, square_meters
-- Commercial: square_meters (shared column)
ALTER TABLE job_requests
  ADD COLUMN IF NOT EXISTS bedrooms      INTEGER,
  ADD COLUMN IF NOT EXISTS bathrooms     NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS square_meters NUMERIC(10,2);

NOTIFY pgrst, 'reload schema';
