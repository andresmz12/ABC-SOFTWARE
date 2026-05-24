-- Create client-documents storage bucket (private, like provider-documents)
insert into storage.buckets (id, name, public)
values ('client-documents', 'client-documents', false)
on conflict (id) do nothing;

-- Client can upload documents to their own folder
create policy "client_docs_owner_upload" on storage.objects
  for insert with check (
    bucket_id = 'client-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Client can read their own documents
create policy "client_docs_owner_read" on storage.objects
  for select using (
    bucket_id = 'client-documents'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Admin can read all client documents
create policy "client_docs_admin_read" on storage.objects
  for select using (
    bucket_id = 'client-documents'
    and exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );
