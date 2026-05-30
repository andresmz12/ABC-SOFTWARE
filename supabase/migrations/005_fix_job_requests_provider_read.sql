-- Fix: the original "job_requests_approved_provider_read" policy required
-- providers to have matching service_areas rows AND matched on city, which
-- meant any provider without configured service areas saw 0 jobs.
-- App-layer filtering (country, state, service_type) is the right place for
-- business-logic filtering; RLS should only enforce access control.

-- Drop the broken city-join policy
drop policy if exists "job_requests_approved_provider_read" on job_requests;
drop policy if exists "job_requests_provider_read" on job_requests;

-- Allow any approved provider to read any job_request.
-- The app layer (fetchOpenJobsForProvider) filters by country, state, and
-- service_type so this does not expose jobs across countries.
create policy "job_requests_provider_read" on job_requests
for select using (
  exists (
    select 1 from companies where user_id = auth.uid() and status = 'approved'
    union all
    select 1 from independents where user_id = auth.uid() and status = 'approved'
  )
);

-- Allow a provider to read a job_request they have already applied to
-- (needed for the My Jobs / jobs.tsx screen — fetchProviderJobs fetches by job IDs).
drop policy if exists "job_requests_applicant_read" on job_requests;
create policy "job_requests_applicant_read" on job_requests
for select using (
  exists (
    select 1 from job_applications ja
    where ja.job_request_id = job_requests.id
      and ja.provider_id = auth.uid()
  )
);

-- Reload PostgREST schema cache
notify pgrst, 'reload schema';
