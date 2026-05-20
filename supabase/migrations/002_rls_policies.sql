-- Enable RLS on all tables
alter table users enable row level security;
alter table companies enable row level security;
alter table independents enable row level security;
alter table clients enable row level security;
alter table service_areas enable row level security;
alter table documents enable row level security;
alter table job_requests enable row level security;
alter table job_applications enable row level security;
alter table reviews enable row level security;
alter table payments enable row level security;
alter table notifications enable row level security;

-- USERS
create policy "users_read_own" on users for select using (auth.uid() = id);
create policy "users_update_own" on users for update using (auth.uid() = id);
create policy "users_insert_own" on users for insert with check (auth.uid() = id);
create policy "admin_read_all_users" on users for select using (
  exists (select 1 from users where id = auth.uid() and role = 'admin')
);

-- COMPANIES
create policy "companies_owner_all" on companies for all using (
  user_id = auth.uid()
);
create policy "admin_read_all_companies" on companies for select using (
  exists (select 1 from users where id = auth.uid() and role = 'admin')
);

-- INDEPENDENTS
create policy "independents_owner_all" on independents for all using (
  user_id = auth.uid()
);
create policy "admin_read_all_independents" on independents for select using (
  exists (select 1 from users where id = auth.uid() and role = 'admin')
);

-- CLIENTS
create policy "clients_owner_all" on clients for all using (
  user_id = auth.uid()
);
create policy "admin_read_all_clients" on clients for select using (
  exists (select 1 from users where id = auth.uid() and role = 'admin')
);

-- SERVICE AREAS
create policy "service_areas_provider_crud" on service_areas for all using (
  provider_id = auth.uid()
);
create policy "service_areas_public_read" on service_areas for select using (
  exists (select 1 from users where id = auth.uid())
);

-- DOCUMENTS
create policy "documents_owner_insert" on documents for insert with check (user_id = auth.uid());
create policy "documents_owner_read" on documents for select using (user_id = auth.uid());
create policy "admin_all_documents" on documents for all using (
  exists (select 1 from users where id = auth.uid() and role = 'admin')
);

-- JOB REQUESTS
create policy "job_requests_client_crud" on job_requests for all using (
  client_id = auth.uid()
);
create policy "job_requests_approved_provider_read" on job_requests for select using (
  exists (
    select 1 from users u
    join service_areas sa on sa.provider_id = u.id
    join job_requests jr on jr.city = sa.city
    where u.id = auth.uid()
      and u.status = 'approved'
      and u.role in ('company','independent')
      and jr.id = job_requests.id
  )
);
create policy "admin_all_job_requests" on job_requests for all using (
  exists (select 1 from users where id = auth.uid() and role = 'admin')
);

-- JOB APPLICATIONS
create policy "applications_provider_crud" on job_applications for all using (
  provider_id = auth.uid()
);
create policy "applications_client_read" on job_applications for select using (
  exists (
    select 1 from job_requests jr
    where jr.id = job_applications.job_request_id
      and jr.client_id = auth.uid()
  )
);
create policy "admin_all_applications" on job_applications for all using (
  exists (select 1 from users where id = auth.uid() and role = 'admin')
);

-- REVIEWS
create policy "reviews_authenticated_insert" on reviews for insert with check (
  auth.uid() = reviewer_id
);
create policy "reviews_public_read" on reviews for select using (true);

-- PAYMENTS
create policy "payments_involved_read" on payments for select using (
  client_id = auth.uid() or provider_id = auth.uid()
);
create policy "admin_all_payments" on payments for all using (
  exists (select 1 from users where id = auth.uid() and role = 'admin')
);

-- NOTIFICATIONS
create policy "notifications_owner_all" on notifications for all using (
  user_id = auth.uid()
);
create policy "admin_all_notifications" on notifications for all using (
  exists (select 1 from users where id = auth.uid() and role = 'admin')
);
