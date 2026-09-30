-- Migration 036: Security hardening
--
--  1. Providers/clients could self-approve (owner FOR ALL policies had no
--     column restrictions). Guard status/identity_verified with triggers.
--  2. notifications INSERT was WITH CHECK (true): anyone could notify anyone.
--  3. job_requests provider UPDATE could rewrite any column. Restrict the
--     writable columns and require both work-order signatures to complete.
--
-- Service-role callers (edge functions, auth.uid() IS NULL) and admins are
-- exempt from all guards.

-- ── 1. Protect approval columns on companies / independents / clients ────────
CREATE OR REPLACE FUNCTION protect_profile_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k text;
  new_j jsonb := to_jsonb(NEW);
BEGIN
  IF auth.uid() IS NULL OR is_admin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Self-registration always starts pending.
    IF new_j ? 'status' THEN
      NEW := jsonb_populate_record(NEW, jsonb_build_object('status', 'pending'));
    END IF;
    IF new_j ? 'identity_verified' THEN
      NEW := jsonb_populate_record(NEW, jsonb_build_object('identity_verified', false));
    END IF;
    RETURN NEW;
  END IF;

  FOREACH k IN ARRAY ARRAY['status', 'identity_verified', 'user_id'] LOOP
    IF (to_jsonb(OLD) -> k) IS DISTINCT FROM (new_j -> k) THEN
      RAISE EXCEPTION 'Column % can only be changed by an administrator', k
        USING ERRCODE = '42501';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_companies_approval    ON companies;
DROP TRIGGER IF EXISTS protect_independents_approval ON independents;
DROP TRIGGER IF EXISTS protect_clients_approval      ON clients;
CREATE TRIGGER protect_companies_approval    BEFORE INSERT OR UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION protect_profile_approval();
CREATE TRIGGER protect_independents_approval BEFORE INSERT OR UPDATE ON independents
  FOR EACH ROW EXECUTE FUNCTION protect_profile_approval();
CREATE TRIGGER protect_clients_approval      BEFORE INSERT OR UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION protect_profile_approval();

-- ── 2. notifications: only self, admins, or the counterpart on a shared job ──
DROP POLICY IF EXISTS "notifications_insert_any_auth" ON notifications;
DROP POLICY IF EXISTS "notifications_insert_scoped"   ON notifications;

CREATE POLICY "notifications_insert_scoped" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR is_admin()
    OR EXISTS (            -- I am the client, target is a provider on my job
      SELECT 1 FROM job_requests jr
      WHERE jr.client_id = auth.uid()
        AND (EXISTS (SELECT 1 FROM job_applications ja
                     WHERE ja.job_request_id = jr.id AND ja.provider_id = notifications.user_id)
          OR EXISTS (SELECT 1 FROM work_orders wo
                     WHERE wo.job_request_id = jr.id AND wo.provider_id = notifications.user_id))
    )
    OR EXISTS (            -- I am the provider, target is the client of that job
      SELECT 1 FROM job_requests jr
      WHERE jr.client_id = notifications.user_id
        AND (EXISTS (SELECT 1 FROM job_applications ja
                     WHERE ja.job_request_id = jr.id AND ja.provider_id = auth.uid())
          OR EXISTS (SELECT 1 FROM work_orders wo
                     WHERE wo.job_request_id = jr.id AND wo.provider_id = auth.uid()))
    )
  );

-- ── 3. job_requests: providers may only touch execution columns ──────────────
CREATE OR REPLACE FUNCTION protect_job_request_provider_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed text[] := ARRAY['status','start_photo_url','started_at','photos_after',
                          'completion_photo_url','completed_at'];
  old_j jsonb := to_jsonb(OLD) - allowed;
  new_j jsonb := to_jsonb(NEW) - allowed;
BEGIN
  -- Owners (client), admins and service role are unrestricted here.
  IF auth.uid() IS NULL OR auth.uid() = OLD.client_id OR is_admin() THEN
    RETURN NEW;
  END IF;

  IF old_j IS DISTINCT FROM new_j THEN
    RAISE EXCEPTION 'Providers may only update job execution fields'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'in_progress' AND OLD.status NOT IN ('open', 'accepted', 'in_progress') THEN
      RAISE EXCEPTION 'Invalid status transition % -> %', OLD.status, NEW.status;
    END IF;
    IF NEW.status = 'completed' THEN
      IF OLD.status <> 'in_progress' THEN
        RAISE EXCEPTION 'Only in-progress jobs can be completed';
      END IF;
      IF EXISTS (SELECT 1 FROM work_orders wo
                 WHERE wo.job_request_id = OLD.id
                   AND (wo.client_signature IS NULL OR wo.provider_signature IS NULL)) THEN
        RAISE EXCEPTION 'Work order must be signed by both parties before completion';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_job_request_provider_update ON job_requests;
CREATE TRIGGER protect_job_request_provider_update
  BEFORE UPDATE ON job_requests
  FOR EACH ROW EXECUTE FUNCTION protect_job_request_provider_update();

NOTIFY pgrst, 'reload schema';
