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
    // Select the `state` column (= department in Colombia, state in USA).
    // We deliberately do NOT filter by city — department-level matching only.
    supabase.from('service_areas').select('state').eq('provider_id', providerId),
    supabase.from(profileTable).select('service_type').eq('user_id', providerId).single(),
  ]);

  if (areasRes.error) console.warn('[fetchOpenJobsForProvider] service_areas error:', areasRes.error.message);
  if (profileRes.error) console.warn('[fetchOpenJobsForProvider] profile error:', profileRes.error.message);

  // Deduplicated list of departments (Colombia) / states (USA) the provider covers.
  const departments = [...new Set((areasRes.data ?? []).map((a: any) => a.state as string).filter(Boolean))];
  const providerServiceType = (profileRes.data as any)?.service_type ?? 'both';

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

  // Filter by department (job_requests.state) when the provider has service areas.
  // Falls back to all open jobs in the country when none are configured yet.
  if (departments.length > 0) {
    query = query.in('state', departments);
  }

  const { data, error } = await query;
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
  // Fetch application + job details concurrently (needed for notification)
  const [appRes, jobDetailsRes] = await Promise.all([
    supabase.from('job_applications').select('provider_id').eq('id', applicationId).single(),
    supabase.from('job_requests').select('service_type, city').eq('id', jobRequestId).single(),
  ]);

  const [acceptRes, rejectRes, jobRes] = await Promise.all([
    supabase.from('job_applications').update({ status: 'accepted' }).eq('id', applicationId),
    supabase.from('job_applications').update({ status: 'rejected' }).eq('job_request_id', jobRequestId).neq('id', applicationId),
    supabase.from('job_requests').update({ status: 'in_progress' }).eq('id', jobRequestId),
  ]);
  if (acceptRes.error) throw acceptRes.error;
  if (rejectRes.error) console.error('[acceptBid] bulk-reject failed:', rejectRes.error);
  if (jobRes.error) throw jobRes.error;

  // Notify the winning provider
  if (appRes.data?.provider_id && jobDetailsRes.data) {
    const { provider_id } = appRes.data;
    const { service_type, city } = jobDetailsRes.data;
    const cityEn = city ? ` in ${city}` : '';
    const cityEs = city ? ` en ${city}` : '';
    const serviceEn = service_type === 'commercial' ? 'Commercial Cleaning' : 'Residential Cleaning';
    const serviceEs = service_type === 'commercial' ? 'Limpieza Comercial' : 'Limpieza Residencial';

    const { error: notifErr } = await supabase.from('notifications').insert({
      user_id: provider_id,
      title_en: 'Bid Accepted!',
      title_es: '¡Oferta Aceptada!',
      body_en: `Your bid for ${serviceEn}${cityEn} was accepted. The client is ready to start!`,
      body_es: `Tu oferta para ${serviceEs}${cityEs} fue aceptada. ¡El cliente está listo para comenzar!`,
      type: 'bid_accepted',
      data: { job_id: jobRequestId },
    });
    if (notifErr) console.error('[acceptBid] notification insert failed:', notifErr);
  }
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
  rejectedJobIds: string[];
}> {
  const { data: apps, error: appsErr } = await supabase
    .from('job_applications')
    .select('job_request_id, status')
    .eq('provider_id', providerId);
  if (appsErr) throw appsErr;
  if (!apps?.length) return { applied: [], active: [], completed: [], rejectedJobIds: [] };

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

  const rejectedJobIds = apps
    .filter((a) => a.status === 'rejected')
    .map((a) => a.job_request_id as string);

  // Only show jobs where THIS provider's application was accepted (not just any in_progress job)
  const active = apps
    .filter((a) => a.status === 'accepted')
    .map((a) => jobMap[a.job_request_id])
    .filter(Boolean) as JobRequest[];

  const completed = (jobs ?? []).filter((j) => j.status === 'completed');

  return { applied, active, completed, rejectedJobIds };
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
