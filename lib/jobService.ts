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

export async function fetchOpenJobsForProvider(
  providerId: string,
  providerRole: 'company' | 'independent',
  country: Country,
): Promise<JobRequest[]> {
  const profileTable = providerRole === 'company' ? 'companies' : 'independents';
  const [areasRes, profileRes] = await Promise.all([
    supabase.from('service_areas').select('state').eq('provider_id', providerId),
    supabase.from(profileTable).select('service_type').eq('user_id', providerId).single(),
  ]);

  if (areasRes.error) console.warn('[fetchOpenJobsForProvider] service_areas error:', areasRes.error.message);
  if (profileRes.error) console.warn('[fetchOpenJobsForProvider] profile error:', profileRes.error.message);

  const states = [...new Set((areasRes.data ?? []).map((a: any) => a.state as string))];
  const providerServiceType = (profileRes.data as any)?.service_type ?? 'both';
  console.log('[fetchOpenJobsForProvider] providerId:', providerId, '| role:', providerRole, '| country:', country);
  console.log('[fetchOpenJobsForProvider] states:', states, '| serviceType:', providerServiceType);

  let query = supabase
    .from('job_requests')
    .select('*')
    .eq('status', 'open')
    .eq('country', country)
    .order('created_at', { ascending: false })
    .limit(50);

  if (providerRole === 'independent') {
    query = query.eq('service_type', 'residential');
  } else if (providerServiceType !== 'both') {
    query = query.eq('service_type', providerServiceType);
  }

  // When no service areas are configured, show all open jobs in the country
  // (fallback so new providers aren't invisible to jobs).
  if (states.length > 0) {
    query = query.in('state', states);
  }

  const { data, error } = await query;
  console.log('[fetchOpenJobsForProvider] result count:', data?.length ?? 0, '| error:', error?.message ?? null);
  if (error) {
    console.error('[fetchOpenJobsForProvider] query failed:', error);
    throw error;
  }
  return data ?? [];
}

export interface BidWithProvider {
  id: string;
  job_request_id: string;
  provider_id: string;
  provider_name: string;
  provider_type: 'company' | 'independent';
  bid_amount_usd?: number;
  bid_amount_cop?: number;
  message?: string;
  status: string;
  applied_at: string;
}

export async function fetchJobBids(jobRequestId: string): Promise<BidWithProvider[]> {
  const { data: apps, error } = await supabase
    .from('job_applications')
    .select('*')
    .eq('job_request_id', jobRequestId)
    .order('applied_at', { ascending: false });

  if (error || !apps?.length) return [];

  const providerIds = apps.map((a) => a.provider_id);
  const [companiesRes, independentsRes] = await Promise.all([
    supabase.from('companies').select('user_id, company_name').in('user_id', providerIds),
    supabase.from('independents').select('user_id, full_name').in('user_id', providerIds),
  ]);

  const nameMap: Record<string, string> = {};
  (companiesRes.data ?? []).forEach((c: any) => { nameMap[c.user_id] = c.company_name; });
  (independentsRes.data ?? []).forEach((i: any) => { if (!nameMap[i.user_id]) nameMap[i.user_id] = i.full_name; });

  return apps.map((a) => ({
    ...a,
    provider_name: nameMap[a.provider_id] ?? 'Provider',
  }));
}

export async function acceptBid(applicationId: string, jobRequestId: string): Promise<void> {
  const [acceptRes, , jobRes] = await Promise.all([
    supabase.from('job_applications').update({ status: 'accepted' }).eq('id', applicationId),
    supabase.from('job_applications').update({ status: 'rejected' }).eq('job_request_id', jobRequestId).neq('id', applicationId),
    supabase.from('job_requests').update({ status: 'in_progress' }).eq('id', jobRequestId),
  ]);
  if (acceptRes.error) throw acceptRes.error;
  if (jobRes.error) throw jobRes.error;
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
