-- Migration 030: Fix work_orders schema + generate_wo_number RLS bypass
--
-- 1. Add country column (was being inserted by code but column didn't exist)
-- 2. Add created_by_admin column if not already added by migration 023
-- 3. Rebuild generate_wo_number as SECURITY DEFINER so it can count
--    work_orders regardless of the calling user's RLS access

ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS created_by_admin BOOLEAN DEFAULT FALSE;

-- Rebuild with SECURITY DEFINER so RLS on work_orders is bypassed during count
CREATE OR REPLACE FUNCTION generate_wo_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT := EXTRACT(YEAR FROM now())::TEXT;
  v_seq  INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO v_seq
  FROM work_orders
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now());
  RETURN 'PV-' || v_year || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;

-- Grant execute to authenticated users so supabase.rpc() works
GRANT EXECUTE ON FUNCTION generate_wo_number() TO authenticated;

NOTIFY pgrst, 'reload schema';
