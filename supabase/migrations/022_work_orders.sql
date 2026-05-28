-- 022_work_orders.sql

CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wo_number TEXT UNIQUE NOT NULL,
  job_request_id UUID REFERENCES job_requests(id),
  client_id UUID REFERENCES auth.users(id),
  provider_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending_signatures',
  client_signature TEXT,
  provider_signature TEXT,
  client_signed_at TIMESTAMPTZ,
  provider_signed_at TIMESTAMPTZ,
  pdf_url TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Per-year sequence approach: atomic, no race conditions under concurrent inserts
CREATE OR REPLACE FUNCTION generate_wo_number()
RETURNS TEXT AS $$
DECLARE
  year_str TEXT := EXTRACT(YEAR FROM now())::TEXT;
  seq_name TEXT := 'wo_seq_' || year_str;
  seq_val  BIGINT;
BEGIN
  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS %I START WITH 1', seq_name);
  seq_val := nextval(seq_name);
  RETURN 'PV-' || year_str || '-' || LPAD(seq_val::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wo_client" ON work_orders FOR ALL USING (client_id = auth.uid());
CREATE POLICY "wo_provider" ON work_orders FOR ALL USING (provider_id = auth.uid());
-- admins table uses user_id column (not id)
CREATE POLICY "wo_admin" ON work_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid())
);
