-- ─── Migration 007: Transactional email triggers ─────────────────────────────
--
-- Uses pg_net (pre-installed on all Supabase projects) to call the
-- `send-email` edge function asynchronously from database triggers.
--
-- SETUP REQUIRED before running this migration:
--
--   1. Deploy the edge function:
--        supabase functions deploy send-email
--
--   2. Set edge function secrets:
--        supabase secrets set SENDGRID_API_KEY=your_key FROM_EMAIL=noreply@yourapp.com
--
--   3. Set these two database config parameters so the trigger helper can
--      resolve the edge function URL and authenticate requests:
--
--        -- Run in Supabase SQL Editor:
--        ALTER DATABASE postgres SET "app.supabase_url" = 'https://<project-ref>.supabase.co';
--        ALTER DATABASE postgres SET "app.service_role_key" = '<your-service-role-key>';
--        -- Then reconnect (or run: SELECT pg_reload_conf();)

-- Enable pg_net extension (provides net.http_post for async HTTP from triggers)
create extension if not exists pg_net;

-- ─── Helper: invoke the send-email edge function ──────────────────────────────

create or replace function send_email_notification(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _url text := current_setting('app.supabase_url', true);
  _key text := current_setting('app.service_role_key', true);
begin
  if _url is null or _url = '' or _key is null or _key = '' then
    raise warning '[send-email] app.supabase_url or app.service_role_key not configured — skipping';
    return;
  end if;

  perform net.http_post(
    url     := _url || '/functions/v1/send-email',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _key
    ),
    body    := payload
  );
end;
$$;

-- ─── Trigger 1: job_requests INSERT → email matching providers ───────────────
-- Business rules enforced inside the edge function:
--   • Match providers whose service_areas.state = job.state (NOT city)
--   • commercial jobs  → notify role = 'company' only
--   • residential jobs → notify role = 'company' AND 'independent'

create or replace function trg_email_new_job()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform send_email_notification(jsonb_build_object(
    'type', 'new_job',
    'data', to_jsonb(NEW)
  ));
  return NEW;
end;
$$;

drop trigger if exists email_on_new_job on job_requests;
create trigger email_on_new_job
  after insert on job_requests
  for each row
  execute function trg_email_new_job();

-- ─── Trigger 2: job_applications INSERT → email the client ───────────────────

create or replace function trg_email_new_offer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform send_email_notification(jsonb_build_object(
    'type', 'new_offer',
    'data', to_jsonb(NEW)
  ));
  return NEW;
end;
$$;

drop trigger if exists email_on_new_offer on job_applications;
create trigger email_on_new_offer
  after insert on job_applications
  for each row
  execute function trg_email_new_offer();

-- ─── Trigger 3: job_applications.status → 'accepted' → email the provider ───

create or replace function trg_email_offer_accepted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Fire only on the transition to 'accepted', not on every update
  if NEW.status = 'accepted' and (OLD.status is distinct from 'accepted') then
    perform send_email_notification(jsonb_build_object(
      'type', 'offer_accepted',
      'data', to_jsonb(NEW)
    ));
  end if;
  return NEW;
end;
$$;

drop trigger if exists email_on_offer_accepted on job_applications;
create trigger email_on_offer_accepted
  after update on job_applications
  for each row
  execute function trg_email_offer_accepted();

-- ─── Trigger 4: users.status → 'approved' or 'rejected' → email provider ────
-- Only fires for provider roles (company, independent); clients and admins
-- are not affected.

create or replace function trg_email_provider_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only applies to provider accounts
  if NEW.role not in ('company', 'independent') then
    return NEW;
  end if;

  if NEW.status = 'approved' and (OLD.status is distinct from 'approved') then
    perform send_email_notification(jsonb_build_object(
      'type', 'provider_approved',
      'data', to_jsonb(NEW)
    ));
  elsif NEW.status = 'rejected' and (OLD.status is distinct from 'rejected') then
    perform send_email_notification(jsonb_build_object(
      'type', 'provider_rejected',
      'data', to_jsonb(NEW)
    ));
  end if;

  return NEW;
end;
$$;

drop trigger if exists email_on_provider_status on users;
create trigger email_on_provider_status
  after update on users
  for each row
  execute function trg_email_provider_status();

-- ─── Trigger 5: users INSERT → welcome email ─────────────────────────────────

create or replace function trg_email_welcome()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform send_email_notification(jsonb_build_object(
    'type', 'welcome',
    'data', to_jsonb(NEW)
  ));
  return NEW;
end;
$$;

drop trigger if exists email_on_user_insert on users;
create trigger email_on_user_insert
  after insert on users
  for each row
  execute function trg_email_welcome();

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
