-- Enable UUID extension
create extension if not exists "pgcrypto";

-- USERS
create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  role text check (role in ('company','independent','client','admin')) not null,
  status text check (status in ('pending','approved','rejected','suspended')) default 'pending',
  country text check (country in ('usa','colombia')) not null,
  preferred_language text check (preferred_language in ('en','es')) default 'en',
  push_token text,
  created_at timestamptz default now()
);

-- COMPANIES
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  company_name text not null,
  ein text not null,
  phone text not null,
  address text not null,
  city text not null,
  state text not null,
  zip text not null,
  service_type text check (service_type in ('commercial','residential','both')) not null,
  stripe_customer_id text,
  created_at timestamptz default now()
);
create index if not exists idx_companies_user_id on companies(user_id);

-- INDEPENDENTS
create table if not exists independents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  address text not null,
  city text not null,
  state text not null,
  zip text not null,
  date_of_birth date not null,
  service_type text check (service_type in ('commercial','residential','both')) not null,
  stripe_customer_id text,
  identity_verified boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_independents_user_id on independents(user_id);

-- CLIENTS
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  full_name text not null,
  phone text not null,
  address text not null,
  city text not null,
  zip text not null,
  country text check (country in ('usa','colombia')) not null,
  service_preference text check (service_preference in ('commercial','residential','both')),
  frequency text check (frequency in ('one_time','weekly','biweekly','monthly')),
  stripe_customer_id text,
  created_at timestamptz default now()
);
create index if not exists idx_clients_user_id on clients(user_id);

-- SERVICE AREAS
create table if not exists service_areas (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid references users(id) on delete cascade,
  provider_type text check (provider_type in ('company','independent')) not null,
  state text not null,
  city text not null,
  county text,
  created_at timestamptz default now()
);
create index if not exists idx_service_areas_provider_id on service_areas(provider_id);
create index if not exists idx_service_areas_city on service_areas(city);

-- DOCUMENTS
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  doc_type text not null,
  file_url text not null,
  file_name text,
  status text check (status in ('pending','approved','rejected')) default 'pending',
  admin_notes text,
  reviewed_by uuid references users(id),
  reviewed_at timestamptz,
  uploaded_at timestamptz default now()
);
create index if not exists idx_documents_user_id on documents(user_id);
create index if not exists idx_documents_status on documents(status);

-- JOB REQUESTS
create table if not exists job_requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references users(id) on delete cascade,
  service_type text check (service_type in ('commercial','residential')) not null,
  city text not null,
  county text,
  state text not null,
  zip text not null,
  country text check (country in ('usa','colombia')) not null,
  scheduled_date date not null,
  scheduled_time time not null,
  estimated_hours numeric(4,1) not null,
  budget_usd numeric(10,2),
  budget_cop numeric(14,2),
  description text,
  photos text[],
  status text check (status in ('open','in_progress','completed','cancelled','expired')) default 'open',
  expires_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_job_requests_client_id on job_requests(client_id);
create index if not exists idx_job_requests_status on job_requests(status);
create index if not exists idx_job_requests_city on job_requests(city);

-- JOB APPLICATIONS
create table if not exists job_applications (
  id uuid primary key default gen_random_uuid(),
  job_request_id uuid references job_requests(id) on delete cascade,
  provider_id uuid references users(id) on delete cascade,
  provider_type text check (provider_type in ('company','independent')) not null,
  bid_amount_usd numeric(10,2),
  bid_amount_cop numeric(14,2),
  message text,
  status text check (status in ('pending','accepted','rejected','withdrawn')) default 'pending',
  applied_at timestamptz default now(),
  unique(job_request_id, provider_id)
);
create index if not exists idx_job_applications_job_id on job_applications(job_request_id);
create index if not exists idx_job_applications_provider_id on job_applications(provider_id);

-- REVIEWS
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  job_request_id uuid references job_requests(id),
  reviewer_id uuid references users(id),
  reviewee_id uuid references users(id),
  rating integer check (rating between 1 and 5) not null,
  comment text,
  created_at timestamptz default now()
);
create index if not exists idx_reviews_reviewee_id on reviews(reviewee_id);

-- PAYMENTS
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  job_request_id uuid references job_requests(id),
  client_id uuid references users(id),
  provider_id uuid references users(id),
  stripe_payment_intent_id text unique,
  amount_usd numeric(10,2),
  amount_cop numeric(14,2),
  currency text check (currency in ('usd','cop')) not null,
  status text check (status in ('held','released','refunded')) default 'held',
  created_at timestamptz default now()
);
create index if not exists idx_payments_job_id on payments(job_request_id);

-- NOTIFICATIONS
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  title_en text not null,
  title_es text not null,
  body_en text not null,
  body_es text not null,
  type text not null,
  data jsonb,
  read boolean default false,
  created_at timestamptz default now()
);
create index if not exists idx_notifications_user_id on notifications(user_id);
create index if not exists idx_notifications_read on notifications(user_id, read);
