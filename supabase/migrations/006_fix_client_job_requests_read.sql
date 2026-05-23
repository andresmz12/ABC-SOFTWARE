-- Explicit SELECT policy so clients can read their own job_requests.
-- The existing "job_requests_client_crud" policy uses FOR ALL with only a
-- USING clause, which covers SELECT in theory, but some PostgREST versions
-- require an explicit FOR SELECT policy for GET requests to work reliably.

create policy "job_requests_client_own" on job_requests
for select using (
  client_id = auth.uid()
);

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
