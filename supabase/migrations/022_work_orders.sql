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
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION generate_wo_number()
RETURNS TEXT AS $$
DECLARE
  year TEXT := EXTRACT(YEAR FROM now())::TEXT;
  seq INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO seq FROM work_orders
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now());
  RETURN 'PV-' || year || '-' || LPAD(seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wo_client" ON work_orders FOR ALL USING (client_id = auth.uid());
CREATE POLICY "wo_provider" ON work_orders FOR ALL USING (provider_id = auth.uid());
CREATE POLICY "wo_admin" ON work_orders FOR ALL USING (
  EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
);
