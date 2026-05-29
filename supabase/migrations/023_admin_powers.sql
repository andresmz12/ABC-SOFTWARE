-- 023_admin_powers.sql
-- Extends disputes, work_orders, and job_applications to track admin-driven actions.

-- disputes: track which provider is the subject of a case and whether admin opened it
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS against_user_id UUID REFERENCES auth.users(id);
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS opened_by_admin BOOLEAN DEFAULT FALSE;

-- work_orders: track manually created WOs
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN DEFAULT FALSE;

-- job_applications: track admin-assigned bids
ALTER TABLE job_applications ADD COLUMN IF NOT EXISTS assigned_by_admin BOOLEAN DEFAULT FALSE;

NOTIFY pgrst, 'reload schema';
