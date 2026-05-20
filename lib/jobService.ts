import { supabase } from '@/lib/supabase';
import type { JobRequest, JobApplication, Country } from '@/types';

export async function fetchOpenJobs(country: Country): Promise<JobRequest[]> {
  const { data, error } = await supabase
    .from('job_requests')
    .select('*')
    .eq('status', 'open')
    .eq('country', country)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

export async function fetchClientJobs(clientId: string): Promise<{
  open: JobRequest[];
  active: JobRequest[];
  completed: JobRequest[];
}> {
  const { data, error } = await supabase
    .from('job_requests')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const jobs = data ?? [];
  return {
    open:      jobs.filter((j) => j.status === 'open'),
    active:    jobs.filter((j) => j.status === 'in_progress'),
    completed: jobs.filter((j) => j.status === 'completed'),
  };
}

export async function fetchApplicationCount(jobId: string): Promise<number> {
  const { count } = await supabase
    .from('job_applications')
    .select('id', { count: 'exact', head: true })
    .eq('job_request_id', jobId);
  return count ?? 0;
}

export async function fetchProviderJobs(providerId: string): Promise<{
  applied: JobRequest[];
  active: JobRequest[];
  completed: JobRequest[];
}> {
  const { data: apps, error: appsErr } = await supabase
    .from('job_applications')
    .select('job_request_id, status')
    .eq('provider_id', providerId);
  if (appsErr) throw appsErr;
  if (!apps?.length) return { applied: [], active: [], completed: [] };

  const jobIds = apps.map((a) => a.job_request_id);
  const { data: jobs, error: jobsErr } = await supabase
    .from('job_requests')
    .select('*')
    .in('id', jobIds);
  if (jobsErr) throw jobsErr;

  const jobMap = Object.fromEntries((jobs ?? []).map((j) => [j.id, j]));

  const applied = apps
    .filter((a) => a.status === 'pending' || a.status === 'rejected')
    .map((a) => jobMap[a.job_request_id])
    .filter(Boolean) as JobRequest[];
  const active    = (jobs ?? []).filter((j) => j.status === 'in_progress');
  const completed = (jobs ?? []).filter((j) => j.status === 'completed');

  return { applied, active, completed };
}

export async function applyToJob({
  jobId,
  providerId,
  providerType,
  bidAmount,
  currency,
  message,
}: {
  jobId: string;
  providerId: string;
  providerType: 'company' | 'independent';
  bidAmount: number;
  currency: 'usd' | 'cop';
  message?: string;
}): Promise<JobApplication> {
  const { data, error } = await supabase
    .from('job_applications')
    .insert({
      job_request_id: jobId,
      provider_id: providerId,
      provider_type: providerType,
      bid_amount_usd: currency === 'usd' ? bidAmount : null,
      bid_amount_cop: currency === 'cop' ? bidAmount : null,
      message,
      status: 'pending',
      applied_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data as JobApplication;
}
