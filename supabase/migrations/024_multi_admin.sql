-- 024_multi_admin.sql
-- Add super-admin flag and display name to the admins table.

ALTER TABLE admins ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS display_name   TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS invited_by     UUID REFERENCES auth.users(id);

-- Mark the first (oldest) admin as super admin automatically.
-- Run this once; subsequent admins are created with is_super_admin = FALSE.
UPDATE admins
SET is_super_admin = TRUE
WHERE id = (SELECT id FROM admins ORDER BY created_at ASC LIMIT 1);

NOTIFY pgrst, 'reload schema';
