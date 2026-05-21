-- =============================================================================
-- ProVendor — Complete Database Migration
-- Paste into Supabase SQL Editor and run once.
-- Safe to re-run: uses IF NOT EXISTS / DROP IF EXISTS throughout.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";


-- ---------------------------------------------------------------------------
-- 1. HELPER FUNCTION — is_admin()
--    SECURITY DEFINER bypasses RLS when called inside policies,
--    breaking the infinite-recursion trap that occurs when an admin
--    policy queries the same table it is protecting.
-- ---------------------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from users where id = auth.uid() and role = 'admin'
  );
$$;


-- ---------------------------------------------------------------------------
-- 2. TABLES
-- ---------------------------------------------------------------------------

-- USERS
-- References auth.users so Supabase Auth drives identity.
create table if not exists users (
  id                 uuid        primary key references auth.users(id) on delete cascade,
  email              text        unique not null,
  role               text        not null check (role in ('company','independent','client','admin')),
  status             text        not null default 'pending'
                                 check (status in ('pending','approved','rejected','suspended')),
  country            text        not null check (country in ('usa','colombia')),
  preferred_language text        not null default 'en'
                                 check (preferred_language in ('en','es')),
  available          boolean     not null default false,
  push_token         text,
  created_at         timestamptz not null default now()
);


-- COMPANIES
create table if not exists companies (
  id                 uuid        primary key default gen_random_uuid(),
  user_id            uuid        not null references users(id) on delete cascade,
  company_name       text        not null,
  ein                text        not null,   -- NIT for Colombia registrations
  phone              text        not null,
  address            text        not null,
  city               text        not null,
  state              text        not null,   -- Departamento for Colombia
  zip                text        not null,   -- Barrio/código for Colombia
  service_type       text        not null check (service_type in ('commercial','residential','both')),
  stripe_customer_id text,
  created_at         timestamptz not null default now()
);

create index if not exists idx_companies_user_id on companies(user_id);


-- INDEPENDENTS
create table if not exists independents (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references users(id) on delete cascade,
  full_name           text        not null,
  phone               text        not null,
  address             text        not null,
  city                text        not null,
  state               text        not null,
  zip                 text        not null,
  date_of_birth       date        not null,
  service_type        text        not null check (service_type in ('commercial','residential','both')),
  stripe_customer_id  text,
  identity_verified   boolean     not null default false,
  created_at          timestamptz not null default now()
);

create index if not exists idx_independents_user_id on independents(user_id);


-- CLIENTS
create table if not exists clients (
  id                  uuid        primary key default gen_random_uuid(),
  user_id             uuid        not null references users(id) on delete cascade,
  full_name           text        not null,
  phone               text        not null,
  address             text        not null,
  city                text        not null,
  zip                 text        not null,
  country             text        not null check (country in ('usa','colombia')),
  service_preference  text        check (service_preference in ('commercial','residential','both')),
  frequency           text        check (frequency in ('one_time','weekly','biweekly','monthly')),
  stripe_customer_id  text,
  created_at          timestamptz not null default now()
);

create index if not exists idx_clients_user_id on clients(user_id);


-- SERVICE_AREAS
create table if not exists service_areas (
  id            uuid        primary key default gen_random_uuid(),
  provider_id   uuid        not null references users(id) on delete cascade,
  provider_type text        not null check (provider_type in ('company','independent')),
  state         text        not null,
  city          text        not null,
  county        text,
  created_at    timestamptz not null default now()
);

create index if not exists idx_service_areas_provider_id on service_areas(provider_id);
create index if not exists idx_service_areas_city        on service_areas(city);


-- DOCUMENTS
-- unique(user_id, doc_type) enables uploadDocument.ts upsert with onConflict.
create table if not exists documents (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references users(id) on delete cascade,
  doc_type    text        not null,
  file_url    text        not null,
  file_name   text,
  status      text        not null default 'pending'
              check (status in ('pending','approved','rejected')),
  admin_notes text,
  reviewed_by uuid        references users(id),
  reviewed_at timestamptz,
  uploaded_at timestamptz not null default now(),
  unique (user_id, doc_type)
);

create index if not exists idx_documents_user_id on documents(user_id);
create index if not exists idx_documents_status  on documents(status);


-- JOB_REQUESTS
create table if not exists job_requests (
  id              uuid           primary key default gen_random_uuid(),
  client_id       uuid           not null references users(id) on delete cascade,
  service_type    text           not null check (service_type in ('commercial','residential')),
  city            text           not null,
  county          text,
  state           text           not null,
  zip             text           not null,
  country         text           not null check (country in ('usa','colombia')),
  scheduled_date  date           not null,
  scheduled_time  time           not null,
  estimated_hours numeric(4,1)   not null,
  budget_usd      numeric(10,2),
  budget_max_usd  numeric(10,2),
  budget_cop      numeric(14,2),
  budget_max_cop  numeric(14,2),
  description     text,
  photos          text[],
  status          text           not null default 'open'
                  check (status in ('open','in_progress','completed','cancelled','expired')),
  expires_at      timestamptz,
  created_at      timestamptz    not null default now()
);

create index if not exists idx_job_requests_client_id on job_requests(client_id);
create index if not exists idx_job_requests_status    on job_requests(status);
create index if not exists idx_job_requests_city      on job_requests(city);
create index if not exists idx_job_requests_country   on job_requests(country);


-- JOB_APPLICATIONS
-- unique(job_request_id, provider_id) prevents duplicate bids.
create table if not exists job_applications (
  id              uuid           primary key default gen_random_uuid(),
  job_request_id  uuid           not null references job_requests(id) on delete cascade,
  provider_id     uuid           not null references users(id) on delete cascade,
  provider_type   text           not null check (provider_type in ('company','independent')),
  bid_amount_usd  numeric(10,2),
  bid_amount_cop  numeric(14,2),
  message         text,
  status          text           not null default 'pending'
                  check (status in ('pending','accepted','rejected','withdrawn')),
  applied_at      timestamptz    not null default now(),
  unique (job_request_id, provider_id)
);

create index if not exists idx_job_applications_job_id      on job_applications(job_request_id);
create index if not exists idx_job_applications_provider_id on job_applications(provider_id);


-- REVIEWS
create table if not exists reviews (
  id              uuid        primary key default gen_random_uuid(),
  job_request_id  uuid        references job_requests(id) on delete set null,
  reviewer_id     uuid        references users(id) on delete set null,
  reviewee_id     uuid        references users(id) on delete set null,
  rating          integer     not null check (rating between 1 and 5),
  comment         text,
  created_at      timestamptz not null default now()
);

create index if not exists idx_reviews_reviewee_id on reviews(reviewee_id);
create index if not exists idx_reviews_job_id      on reviews(job_request_id);


-- PAYMENTS
create table if not exists payments (
  id                         uuid           primary key default gen_random_uuid(),
  job_request_id             uuid           references job_requests(id) on delete set null,
  client_id                  uuid           references users(id) on delete set null,
  provider_id                uuid           references users(id) on delete set null,
  stripe_payment_intent_id   text           unique,
  amount_usd                 numeric(10,2),
  amount_cop                 numeric(14,2),
  currency                   text           not null check (currency in ('usd','cop')),
  status                     text           not null default 'held'
                             check (status in ('held','released','refunded')),
  created_at                 timestamptz    not null default now()
);

create index if not exists idx_payments_job_id      on payments(job_request_id);
create index if not exists idx_payments_client_id   on payments(client_id);
create index if not exists idx_payments_provider_id on payments(provider_id);


-- NOTIFICATIONS
create table if not exists notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references users(id) on delete cascade,
  title_en   text        not null,
  title_es   text        not null,
  body_en    text        not null,
  body_es    text        not null,
  type       text        not null,
  data       jsonb,
  read       boolean     not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id      on notifications(user_id);
create index if not exists idx_notifications_user_unread  on notifications(user_id, read) where (read = false);


-- ---------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

alter table users              enable row level security;
alter table companies          enable row level security;
alter table independents       enable row level security;
alter table clients            enable row level security;
alter table service_areas      enable row level security;
alter table documents          enable row level security;
alter table job_requests       enable row level security;
alter table job_applications   enable row level security;
alter table reviews            enable row level security;
alter table payments           enable row level security;
alter table notifications      enable row level security;


-- Drop all existing policies first so this script is idempotent.
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies
           where schemaname = 'public' loop
    execute format('drop policy if exists %I on %I', r.policyname, r.tablename);
  end loop;
end $$;


-- ── USERS ───────────────────────────────────────────────────────────────────
-- Every authenticated user may read and update their own row.
create policy "users_select_own"
  on users for select
  using (auth.uid() = id);

create policy "users_insert_own"
  on users for insert
  with check (auth.uid() = id);

create policy "users_update_own"
  on users for update
  using (auth.uid() = id);

-- Admins can read all user rows.
-- Uses is_admin() (SECURITY DEFINER) to avoid recursive RLS evaluation.
create policy "users_admin_select_all"
  on users for select
  using (is_admin());

-- Admins can update any user row (status changes, etc.).
create policy "users_admin_update_all"
  on users for update
  using (is_admin());


-- ── COMPANIES ───────────────────────────────────────────────────────────────
create policy "companies_owner_all"
  on companies for all
  using (user_id = auth.uid());

-- Admins can read all company profiles (for document review / approval flow).
create policy "companies_admin_select"
  on companies for select
  using (is_admin());

-- Approved providers/clients can read company profiles (for browse-providers screen).
create policy "companies_approved_read"
  on companies for select
  using (
    exists (
      select 1 from users
      where id = auth.uid()
        and status = 'approved'
    )
  );


-- ── INDEPENDENTS ────────────────────────────────────────────────────────────
create policy "independents_owner_all"
  on independents for all
  using (user_id = auth.uid());

create policy "independents_admin_select"
  on independents for select
  using (is_admin());

create policy "independents_approved_read"
  on independents for select
  using (
    exists (
      select 1 from users
      where id = auth.uid()
        and status = 'approved'
    )
  );


-- ── CLIENTS ─────────────────────────────────────────────────────────────────
create policy "clients_owner_all"
  on clients for all
  using (user_id = auth.uid());

create policy "clients_admin_select"
  on clients for select
  using (is_admin());


-- ── SERVICE AREAS ────────────────────────────────────────────────────────────
-- Providers manage their own service areas.
create policy "service_areas_owner_all"
  on service_areas for all
  using (provider_id = auth.uid());

-- Any authenticated user can read service areas
-- (needed for job-matching queries from Edge Functions and browse screens).
create policy "service_areas_authenticated_read"
  on service_areas for select
  using (auth.uid() is not null);


-- ── DOCUMENTS ───────────────────────────────────────────────────────────────
-- Providers can insert and read their own documents.
create policy "documents_owner_insert"
  on documents for insert
  with check (user_id = auth.uid());

create policy "documents_owner_select"
  on documents for select
  using (user_id = auth.uid());

create policy "documents_owner_update"
  on documents for update
  using (user_id = auth.uid());

-- Admins have full access for review/approval flow.
create policy "documents_admin_all"
  on documents for all
  using (is_admin());


-- ── JOB REQUESTS ────────────────────────────────────────────────────────────
-- Clients own their job requests.
create policy "job_requests_client_all"
  on job_requests for all
  using (client_id = auth.uid());

-- Approved providers see open jobs in cities they serve.
-- Fixed: original policy had a redundant self-join on job_requests.
create policy "job_requests_provider_read"
  on job_requests for select
  using (
    exists (
      select 1
      from users u
      join service_areas sa on sa.provider_id = u.id
      where u.id         = auth.uid()
        and u.status     = 'approved'
        and u.role       in ('company', 'independent')
        and sa.city      = job_requests.city
    )
  );

create policy "job_requests_admin_all"
  on job_requests for all
  using (is_admin());


-- ── JOB APPLICATIONS ────────────────────────────────────────────────────────
-- Providers manage their own applications.
create policy "applications_provider_all"
  on job_applications for all
  using (provider_id = auth.uid());

-- Clients can read applications submitted against their jobs.
create policy "applications_client_read"
  on job_applications for select
  using (
    exists (
      select 1 from job_requests jr
      where jr.id        = job_applications.job_request_id
        and jr.client_id = auth.uid()
    )
  );

create policy "applications_admin_all"
  on job_applications for all
  using (is_admin());


-- ── REVIEWS ─────────────────────────────────────────────────────────────────
-- Reviews are publicly readable (shown on provider profiles).
create policy "reviews_public_read"
  on reviews for select
  using (true);

-- Only the reviewer may insert their own review.
create policy "reviews_reviewer_insert"
  on reviews for insert
  with check (auth.uid() = reviewer_id);


-- ── PAYMENTS ────────────────────────────────────────────────────────────────
-- Only the involved client or provider can see payment records.
create policy "payments_parties_read"
  on payments for select
  using (client_id = auth.uid() or provider_id = auth.uid());

create policy "payments_admin_all"
  on payments for all
  using (is_admin());


-- ── NOTIFICATIONS ────────────────────────────────────────────────────────────
-- Users read and update (mark-read) their own notifications.
create policy "notifications_owner_all"
  on notifications for all
  using (user_id = auth.uid());

-- Admins can insert notifications for any user (approval/rejection flows).
create policy "notifications_admin_all"
  on notifications for all
  using (is_admin());


-- ---------------------------------------------------------------------------
-- 4. STORAGE BUCKETS
--    Note: uploadDocument.ts uses bucket id 'documents' (not 'provider-documents').
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  -- Private: provider KYC documents and images
  ('documents',          'documents',          false,  20971520,
   array['application/pdf','image/jpeg','image/jpg','image/png','image/heic']),
  -- Private: before/after job photos attached to job requests
  ('job-photos',         'job-photos',         false,  10485760,
   array['image/jpeg','image/jpg','image/png','image/heic','image/webp']),
  -- Public: profile avatar images
  ('profile-photos',     'profile-photos',     true,   5242880,
   array['image/jpeg','image/jpg','image/png','image/heic','image/webp']),
  -- Public (auth-gated): downloadable document templates / checklists
  ('document-templates', 'document-templates', false,  10485760,
   array['application/pdf'])
on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- 5. STORAGE OBJECT POLICIES
-- ---------------------------------------------------------------------------

-- Drop all existing storage policies first.
do $$ declare r record; begin
  for r in select policyname from pg_policies
           where schemaname = 'storage' and tablename = 'objects' loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;


-- ── documents bucket ────────────────────────────────────────────────────────
-- Path convention: {user_id}/{doc_type}/{timestamp}_{filename}
-- The first folder segment must equal auth.uid().

create policy "documents_owner_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "documents_owner_read"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "documents_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admins can read all provider documents.
create policy "documents_admin_read"
  on storage.objects for select
  using (
    bucket_id = 'documents'
    and is_admin()
  );


-- ── job-photos bucket ────────────────────────────────────────────────────────
-- Path convention: {client_id}/{job_request_id}/{filename}

create policy "job_photos_client_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'job-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "job_photos_authenticated_read"
  on storage.objects for select
  using (
    bucket_id = 'job-photos'
    and auth.uid() is not null
  );

create policy "job_photos_client_delete"
  on storage.objects for delete
  using (
    bucket_id = 'job-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- ── profile-photos bucket (public) ──────────────────────────────────────────
-- Path convention: {user_id}/{filename}

create policy "profile_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

create policy "profile_photos_owner_upload"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "profile_photos_owner_delete"
  on storage.objects for delete
  using (
    bucket_id = 'profile-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );


-- ── document-templates bucket ────────────────────────────────────────────────
-- Any authenticated user may download templates.

create policy "templates_authenticated_read"
  on storage.objects for select
  using (
    bucket_id = 'document-templates'
    and auth.role() = 'authenticated'
  );

-- Only admins may upload or manage templates.
create policy "templates_admin_write"
  on storage.objects for insert
  with check (
    bucket_id = 'document-templates'
    and is_admin()
  );

create policy "templates_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'document-templates'
    and is_admin()
  );


-- ---------------------------------------------------------------------------
-- 6. OPTIONAL: auto-expire jobs via a scheduled cron job
--    Enable the pg_cron extension in Supabase Dashboard → Database → Extensions,
--    then uncomment this block.
-- ---------------------------------------------------------------------------

-- create extension if not exists pg_cron;
--
-- select cron.schedule(
--   'expire-old-jobs',
--   '*/15 * * * *',
--   $$
--     update job_requests
--     set status = 'expired'
--     where status = 'open'
--       and expires_at < now();
--   $$
-- );


-- ---------------------------------------------------------------------------
-- Done.
-- ---------------------------------------------------------------------------
