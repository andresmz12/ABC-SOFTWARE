-- Migration 016: add status column to clients table
-- Required for admin approval flow (updateProviderStatus writes to this column).
-- Existing clients default to 'approved' so they are not locked out.

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved'
  CHECK (status IN ('pending', 'approved', 'rejected', 'suspended'));

-- Clients who uploaded an identity document during registration and whose
-- document is still pending should be marked pending as well.
UPDATE clients c
SET status = 'pending'
WHERE EXISTS (
  SELECT 1 FROM documents d
  WHERE d.user_id = c.user_id
    AND d.status = 'pending'
)
AND c.status = 'approved';

NOTIFY pgrst, 'reload schema';
