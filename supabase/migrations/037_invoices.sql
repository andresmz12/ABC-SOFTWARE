-- Migration 037: Simple invoices (provider drafts -> admin approves -> sent to client)
--
-- Flow:  draft -> pending_approval -> sent -> paid
--                       \-> rejected -> (provider edits) -> pending_approval
--        any non-paid state -> void (admin only)
--
-- Security model:
--   * Drafts are created ONLY through create_invoice_draft() (SECURITY DEFINER),
--     which verifies the caller is the accepted provider of a COMPLETED job.
--   * Providers can edit their own invoice only while it is draft/rejected, and
--     a trigger stops them touching approval/payment fields.
--   * Clients only see invoices once they have been sent (sent / paid).
--   * Admins (is_admin()) can do everything.

-- ── Tables ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoice_counters (
  year INTEGER PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE invoice_counters ENABLE ROW LEVEL SECURITY; -- no policies: only SECURITY DEFINER code touches it

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inv_number TEXT UNIQUE NOT NULL,
  job_request_id UUID NOT NULL REFERENCES job_requests(id),
  provider_id UUID NOT NULL REFERENCES auth.users(id),
  client_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending_approval','rejected','sent','paid','void')),
  currency TEXT NOT NULL DEFAULT 'usd' CHECK (currency IN ('usd','cop')),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2)  NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 100),
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  admin_notes TEXT,
  -- snapshot of parties at creation time (invoice must not change if profiles do)
  provider_name TEXT,
  provider_email TEXT,
  client_name TEXT,
  client_email TEXT,
  service_description TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  submitted_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One live invoice per job (a voided one can be replaced)
CREATE UNIQUE INDEX IF NOT EXISTS invoices_one_live_per_job
  ON invoices(job_request_id) WHERE status <> 'void';
CREATE INDEX IF NOT EXISTS invoices_provider_idx ON invoices(provider_id);
CREATE INDEX IF NOT EXISTS invoices_client_idx   ON invoices(client_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx   ON invoices(status);

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS invoice_items_invoice_idx ON invoice_items(invoice_id);

-- ── Numbering: INV-2026-0001 (gap-free per year, race-safe via row lock) ─────
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  y INTEGER := EXTRACT(YEAR FROM now())::INTEGER;
  n INTEGER;
BEGIN
  INSERT INTO invoice_counters(year, last_number) VALUES (y, 1)
  ON CONFLICT (year) DO UPDATE SET last_number = invoice_counters.last_number + 1
  RETURNING last_number INTO n;
  RETURN 'INV-' || y || '-' || LPAD(n::TEXT, 4, '0');
END;
$$;
REVOKE ALL ON FUNCTION generate_invoice_number() FROM PUBLIC;

-- ── Totals are always computed server-side ───────────────────────────────────
CREATE OR REPLACE FUNCTION recalc_invoice_totals(p_invoice_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub NUMERIC(12,2);
  rate NUMERIC(5,2);
  tax NUMERIC(12,2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO sub FROM invoice_items WHERE invoice_id = p_invoice_id;
  SELECT tax_rate INTO rate FROM invoices WHERE id = p_invoice_id;
  tax := ROUND(sub * COALESCE(rate, 0) / 100, 2);
  UPDATE invoices SET subtotal = sub, tax_amount = tax, total = sub + tax WHERE id = p_invoice_id;
END;
$$;
REVOKE ALL ON FUNCTION recalc_invoice_totals(UUID) FROM PUBLIC;

-- item.amount = quantity * unit_price (never trust the client)
CREATE OR REPLACE FUNCTION invoice_items_before_write()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.amount := ROUND(NEW.quantity * NEW.unit_price, 2);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_invoice_items_before_write ON invoice_items;
CREATE TRIGGER trg_invoice_items_before_write
  BEFORE INSERT OR UPDATE ON invoice_items
  FOR EACH ROW EXECUTE FUNCTION invoice_items_before_write();

CREATE OR REPLACE FUNCTION invoice_items_after_write()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM recalc_invoice_totals(COALESCE(NEW.invoice_id, OLD.invoice_id));
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_invoice_items_after_write ON invoice_items;
CREATE TRIGGER trg_invoice_items_after_write
  AFTER INSERT OR UPDATE OR DELETE ON invoice_items
  FOR EACH ROW EXECUTE FUNCTION invoice_items_after_write();

-- ── Guard: who may change what on an invoice ─────────────────────────────────
CREATE OR REPLACE FUNCTION invoices_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();

  -- Nested call from our own SECURITY DEFINER recalculation triggers (totals) is trusted;
  -- top-level user updates run at trigger depth 1.
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- service role / SQL editor (no auth.uid()) and admins are unrestricted
  IF auth.uid() IS NULL OR is_admin() THEN
    RETURN NEW;
  END IF;

  -- Everyone else is the provider (RLS already restricts rows). Immutable fields:
  IF NEW.inv_number     IS DISTINCT FROM OLD.inv_number
  OR NEW.job_request_id IS DISTINCT FROM OLD.job_request_id
  OR NEW.provider_id    IS DISTINCT FROM OLD.provider_id
  OR NEW.client_id      IS DISTINCT FROM OLD.client_id
  OR NEW.currency       IS DISTINCT FROM OLD.currency
  OR NEW.client_name    IS DISTINCT FROM OLD.client_name
  OR NEW.client_email   IS DISTINCT FROM OLD.client_email
  OR NEW.provider_name  IS DISTINCT FROM OLD.provider_name
  OR NEW.provider_email IS DISTINCT FROM OLD.provider_email
  OR NEW.admin_notes    IS DISTINCT FROM OLD.admin_notes
  OR NEW.approved_by    IS DISTINCT FROM OLD.approved_by
  OR NEW.approved_at    IS DISTINCT FROM OLD.approved_at
  OR NEW.sent_at        IS DISTINCT FROM OLD.sent_at
  OR NEW.paid_at        IS DISTINCT FROM OLD.paid_at
  OR NEW.subtotal       IS DISTINCT FROM OLD.subtotal
  OR NEW.tax_amount     IS DISTINCT FROM OLD.tax_amount
  OR NEW.total          IS DISTINCT FROM OLD.total THEN
    RAISE EXCEPTION 'Not allowed to modify these invoice fields';
  END IF;

  -- Allowed provider transitions: draft/rejected stay, or go to pending_approval
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NOT (OLD.status IN ('draft','rejected') AND NEW.status = 'pending_approval') THEN
    RAISE EXCEPTION 'Invalid status change % -> %', OLD.status, NEW.status;
  END IF;

  IF NEW.status = 'pending_approval' AND OLD.status IS DISTINCT FROM 'pending_approval' THEN
    NEW.submitted_at := now();
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_invoices_guard ON invoices;
CREATE TRIGGER trg_invoices_guard
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION invoices_guard();

-- Tax rate changes must refresh totals
CREATE OR REPLACE FUNCTION invoices_after_tax_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.tax_rate IS DISTINCT FROM OLD.tax_rate THEN
    PERFORM recalc_invoice_totals(NEW.id);
  END IF;
  RETURN NULL;
END;
$$;
DROP TRIGGER IF EXISTS trg_invoices_after_tax_change ON invoices;
CREATE TRIGGER trg_invoices_after_tax_change
  AFTER UPDATE OF tax_rate ON invoices
  FOR EACH ROW EXECUTE FUNCTION invoices_after_tax_change();

-- ── Create draft from a completed job ────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_invoice_draft(p_job_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  job RECORD;
  app RECORD;
  existing UUID;
  inv_id UUID;
  cur TEXT;
  amt NUMERIC(12,2);
  prov_name TEXT;
  prov_email TEXT;
  cli_name TEXT;
  cli_email TEXT;
  svc TEXT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO job FROM job_requests WHERE id = p_job_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Job not found'; END IF;
  IF job.status <> 'completed' THEN RAISE EXCEPTION 'Job is not completed'; END IF;

  SELECT * INTO app FROM job_applications
   WHERE job_request_id = p_job_id AND status = 'accepted' AND provider_id = uid
   LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'You are not the accepted provider for this job'; END IF;

  -- idempotent: return the live invoice if one exists
  SELECT id INTO existing FROM invoices WHERE job_request_id = p_job_id AND status <> 'void';
  IF existing IS NOT NULL THEN RETURN existing; END IF;

  IF app.bid_amount_usd IS NOT NULL THEN cur := 'usd'; amt := app.bid_amount_usd;
  ELSE cur := 'cop'; amt := COALESCE(app.bid_amount_cop, 0); END IF;

  SELECT email INTO prov_email FROM users WHERE id = uid;
  SELECT email INTO cli_email  FROM users WHERE id = job.client_id;
  SELECT COALESCE(
           (SELECT company_name FROM companies    WHERE user_id = uid LIMIT 1),
           (SELECT full_name    FROM independents WHERE user_id = uid LIMIT 1),
           prov_email) INTO prov_name;
  SELECT COALESCE((SELECT full_name FROM clients WHERE user_id = job.client_id LIMIT 1), cli_email)
    INTO cli_name;

  svc := CASE WHEN job.service_type = 'commercial' THEN 'Commercial cleaning' ELSE 'Residential cleaning' END
      || ' – ' || COALESCE(job.city, '') || COALESCE(', ' || job.state, '')
      || ' (' || to_char(job.scheduled_date, 'YYYY-MM-DD') || ')';

  INSERT INTO invoices(
    inv_number, job_request_id, provider_id, client_id, currency,
    provider_name, provider_email, client_name, client_email, service_description, due_date
  ) VALUES (
    generate_invoice_number(), p_job_id, uid, job.client_id, cur,
    prov_name, prov_email, cli_name, cli_email, svc, CURRENT_DATE + 15
  ) RETURNING id INTO inv_id;

  INSERT INTO invoice_items(invoice_id, description, quantity, unit_price, position)
  VALUES (inv_id, svc, 1, amt, 0);

  RETURN inv_id;
END;
$$;
REVOKE ALL ON FUNCTION create_invoice_draft(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_invoice_draft(UUID) TO authenticated;

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invoices_admin_all"       ON invoices;
DROP POLICY IF EXISTS "invoices_provider_select" ON invoices;
DROP POLICY IF EXISTS "invoices_provider_update" ON invoices;
DROP POLICY IF EXISTS "invoices_client_select"   ON invoices;

CREATE POLICY "invoices_admin_all" ON invoices FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "invoices_provider_select" ON invoices FOR SELECT
  USING (provider_id = auth.uid());

CREATE POLICY "invoices_provider_update" ON invoices FOR UPDATE
  USING (provider_id = auth.uid() AND status IN ('draft','rejected'))
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "invoices_client_select" ON invoices FOR SELECT
  USING (client_id = auth.uid() AND status IN ('sent','paid'));

DROP POLICY IF EXISTS "invoice_items_admin_all"       ON invoice_items;
DROP POLICY IF EXISTS "invoice_items_provider_all"    ON invoice_items;
DROP POLICY IF EXISTS "invoice_items_client_select"   ON invoice_items;

CREATE POLICY "invoice_items_admin_all" ON invoice_items FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "invoice_items_provider_all" ON invoice_items FOR ALL
  USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id
                 AND i.provider_id = auth.uid() AND i.status IN ('draft','rejected')))
  WITH CHECK (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id
                 AND i.provider_id = auth.uid() AND i.status IN ('draft','rejected')));

CREATE POLICY "invoice_items_client_select" ON invoice_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id
                 AND i.client_id = auth.uid() AND i.status IN ('sent','paid')));

-- Providers also need to read items of their own non-editable invoices
DROP POLICY IF EXISTS "invoice_items_provider_select" ON invoice_items;
CREATE POLICY "invoice_items_provider_select" ON invoice_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_id AND i.provider_id = auth.uid()));

NOTIFY pgrst, 'reload schema';
