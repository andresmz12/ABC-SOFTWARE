-- Create storage buckets
insert into storage.buckets (id, name, public) values
  ('provider-documents', 'provider-documents', false),
  ('job-photos', 'job-photos', false),
  ('profile-photos', 'profile-photos', true),
  ('document-templates', 'document-templates', true)
on conflict (id) do nothing;

-- provider-documents: owner upload + admin read
create policy "provider_docs_owner_upload" on storage.objects for insert with check (
  bucket_id = 'provider-documents' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "provider_docs_owner_read" on storage.objects for select using (
  bucket_id = 'provider-documents' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "provider_docs_admin_read" on storage.objects for select using (
  bucket_id = 'provider-documents' and
  exists (select 1 from public.users where id = auth.uid() and role = 'admin')
);

-- job-photos: client owner upload, approved providers read
create policy "job_photos_client_upload" on storage.objects for insert with check (
  bucket_id = 'job-photos'
);
create policy "job_photos_read" on storage.objects for select using (
  bucket_id = 'job-photos'
);

-- profile-photos: public read, owner write
create policy "profile_photos_public_read" on storage.objects for select using (
  bucket_id = 'profile-photos'
);
create policy "profile_photos_owner_write" on storage.objects for insert with check (
  bucket_id = 'profile-photos' and auth.uid()::text = (storage.foldername(name))[1]
);

-- document-templates: public read for authenticated
create policy "templates_public_read" on storage.objects for select using (
  bucket_id = 'document-templates' and auth.role() = 'authenticated'
);
