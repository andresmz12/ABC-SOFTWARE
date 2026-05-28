import { supabase } from '@/lib/supabase';
import { sendPushNotification } from '@/lib/notifications';
import { getUserPushTokens } from '@/lib/userUtils';
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

const PAGE_SIZE = 25;

export async function fetchOpenJobsForProvider(
  providerId: string,
  providerRole: 'company' | 'independent',
  country: Country,
  offset = 0,
): Promise<{ jobs: JobRequest[]; hasMore: boolean }> {
  const profileTable = providerRole === 'company' ? 'companies' : 'independents';
  const [areasRes, profileRes] = await Promise.all([
    // Select the `state` column (= department in Colombia, state in USA).
    // We deliberately do NOT filter by city — department-level matching only.
    supabase.from('service_areas').select('state').eq('provider_id', providerId),
    supabase.from(profileTable).select('service_type').eq('user_id', providerId).maybeSingle(),
  ]);

  if (areasRes.error) console.warn('[fetchOpenJobsForProvider] service_areas error:', areasRes.error.message);
  if (profileRes.error) console.warn('[fetchOpenJobsForProvider] profile error:', profileRes.error.message);

  // Deduplicated list of departments (Colombia) / states (USA) the provider covers.
  const departments = [...new Set((areasRes.data ?? []).map((a: any) => a.state as string).filter(Boolean))];

  // No service areas configured → show nothing until the provider sets them up.
  if (departments.length === 0) return { jobs: [], hasMore: false };

  const providerServiceType = (profileRes.data as any)?.service_type ?? 'both';

  // Fetch PAGE_SIZE + 1 to detect whether a next page exists.
  let query = supabase
    .from('job_requests')
    .select('*')
    .eq('status', 'open')
    .eq('country', country)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE);

  if (providerRole === 'independent') {
    query = query.eq('service_type', 'residential');
  } else if (providerServiceType !== 'both') {
    query = query.eq('service_type', providerServiceType);
  }

  query = query.in('state', departments);

  const { data, error } = await query;
  if (error) {
    console.error('[fetchOpenJobsForProvider] query failed:', error);
    throw error;
  }

  const rawRows = data ?? [];
  // PAGE_SIZE+1 means more rows exist beyond this page; trim to PAGE_SIZE.
  const hasMore = rawRows.length > PAGE_SIZE;
  const jobs = hasMore ? rawRows.slice(0, PAGE_SIZE) : rawRows;

  if (jobs.length === 0) return { jobs: [], hasMore };

  // Feed visibility rule: show a job to a provider if either:
  //   (a) the provider has already applied (they can see their "Applied" badge), OR
  //   (b) no one has applied yet (so the job is still up for grabs)
  // Once ANY other provider applies, the job disappears from other providers' feeds.
  const jobIds = jobs.map((j) => j.id);
  const { data: allApps } = await supabase
    .from('job_applications')
    .select('job_request_id, provider_id')
    .in('job_request_id', jobIds);

  const myAppliedJobIds = new Set<string>(
    (allApps ?? []).filter((a) => a.provider_id === providerId).map((a) => a.job_request_id),
  );
  const jobsWithOtherApplicants = new Set<string>(
    (allApps ?? []).filter((a) => a.provider_id !== providerId).map((a) => a.job_request_id),
  );

  return {
    jobs: jobs.filter((job) => myAppliedJobIds.has(job.id) || !jobsWithOtherApplicants.has(job.id)),
    hasMore,
  };
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
  // Fetch application + job details + losing applicants concurrently
  const [appRes, jobDetailsRes, losingAppsRes] = await Promise.all([
    supabase.from('job_applications').select('provider_id').eq('id', applicationId).single(),
    supabase.from('job_requests').select('service_type, city, client_id').eq('id', jobRequestId).single(),
    supabase.from('job_applications').select('provider_id').eq('job_request_id', jobRequestId).neq('id', applicationId),
  ]);

  const [acceptRes, rejectRes, jobRes] = await Promise.all([
    supabase.from('job_applications').update({ status: 'accepted' }).eq('id', applicationId),
    supabase.from('job_applications').update({ status: 'rejected' }).eq('job_request_id', jobRequestId).neq('id', applicationId),
    supabase.from('job_requests').update({ status: 'accepted' }).eq('id', jobRequestId),
  ]);
  if (acceptRes.error) throw acceptRes.error;
  if (rejectRes.error) console.error('[acceptBid] bulk-reject failed:', rejectRes.error);
  if (jobRes.error) throw jobRes.error;

  if (!appRes.data?.provider_id || !jobDetailsRes.data) return;

  const { provider_id } = appRes.data;
  const { service_type, city, client_id } = jobDetailsRes.data;

  // ── Create Work Order ────────────────────────────────────────────────────────
  if (client_id) {
    try {
      const { data: woNumberData, error: rpcErr } = await supabase.rpc('generate_wo_number');
      if (!rpcErr && woNumberData) {
        const { data: woData, error: woErr } = await supabase
          .from('work_orders')
          .insert({
            wo_number: woNumberData,
            job_request_id: jobRequestId,
            client_id,
            provider_id,
            status: 'pending_signatures',
          })
          .select('id, wo_number')
          .single();
        if (woErr) {
          console.error('[acceptBid] work_order insert failed:', woErr);
        } else if (woData) {
          // Notify both parties to sign (fire-and-forget)
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          if (token) {
            supabase.functions.invoke('send-email', {
              body: {
                type: 'wo_created',
                data: {
                  work_order_id: woData.id,
                  wo_number: woData.wo_number,
                  job_request_id: jobRequestId,
                  client_id,
                  provider_id,
                },
              },
            }).catch((e: unknown) => console.warn('[acceptBid] wo_created email failed:', e));
          }
        }
      }
    } catch (e) {
      console.warn('[acceptBid] work_order creation error:', e);
    }
  }
  const cityEn = city ? ` in ${city}` : '';
  const cityEs = city ? ` en ${city}` : '';
  const serviceEn = service_type === 'commercial' ? 'Commercial Cleaning' : 'Residential Cleaning';
  const serviceEs = service_type === 'commercial' ? 'Limpieza Comercial' : 'Limpieza Residencial';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notifPromises: PromiseLike<{ error: any }>[] = [
    // Notify the winning provider
    supabase.from('notifications').insert({
      user_id: provider_id,
      title_en: 'Bid Accepted!',
      title_es: '¡Oferta Aceptada!',
      body_en: `Your bid for ${serviceEn}${cityEn} was accepted. Prepare for the service!`,
      body_es: `Tu oferta para ${serviceEs}${cityEs} fue aceptada. ¡Prepárate para el servicio!`,
      type: 'bid_accepted',
      data: { job_id: jobRequestId },
    }),
  ];

  // Notify the client confirming acceptance
  if (client_id) {
    notifPromises.push(
      supabase.from('notifications').insert({
        user_id: client_id,
        title_en: 'Offer Accepted',
        title_es: 'Oferta Aceptada',
        body_en: `You have accepted a bid for ${serviceEn}${cityEn}. The provider will be in touch soon.`,
        body_es: `Has aceptado una oferta para ${serviceEs}${cityEs}. El proveedor se pondrá en contacto pronto.`,
        type: 'bid_accepted',
        data: { job_id: jobRequestId },
      }) as PromiseLike<{ error: any }>,
    );
  }

  // Notify all losing providers
  const losingProviderIds = (losingAppsRes.data ?? [])
    .map((a) => a.provider_id)
    .filter((id) => id !== provider_id);
  if (losingProviderIds.length > 0) {
    const rejectedNotifs = losingProviderIds.map((pid) => ({
      user_id: pid,
      title_en: 'Bid Not Selected',
      title_es: 'Oferta No Seleccionada',
      body_en: `Your offer for ${serviceEn}${cityEn} was not selected this time. Keep looking for new opportunities!`,
      body_es: `Tu oferta para ${serviceEs}${cityEs} no fue seleccionada esta vez. ¡Sigue buscando nuevas oportunidades!`,
      type: 'bid_rejected',
      data: { job_id: jobRequestId },
    }));
    notifPromises.push(supabase.from('notifications').insert(rejectedNotifs) as PromiseLike<{ error: any }>);
  }

  const results = await Promise.all(notifPromises);
  results.forEach((r, i) => {
    if (r.error) console.error(`[acceptBid] notification #${i} failed:`, r.error);
  });

  // ── Push notifications ──────────────────────────────────────────────────────
  // Fetch push tokens across profile tables (no users table required)
  const allUserIds = [provider_id, ...(client_id ? [client_id] : []), ...losingProviderIds];
  const tokenMap = await getUserPushTokens(allUserIds);

  const pushPromises: Promise<void>[] = [];

  // Winner
  const winner = tokenMap[provider_id];
  if (winner?.token) {
    pushPromises.push(sendPushNotification(
      winner.token,
      winner.es ? '🎉 ¡Oferta Aceptada!' : '🎉 Bid Accepted!',
      winner.es
        ? `Tu oferta para ${serviceEs}${cityEs} fue aceptada.`
        : `Your bid for ${serviceEn}${cityEn} was accepted.`,
      { type: 'bid_accepted', jobId: jobRequestId },
    ));
  }

  // Client
  if (client_id) {
    const cl = tokenMap[client_id];
    if (cl?.token) {
      pushPromises.push(sendPushNotification(
        cl.token,
        cl.es ? '✅ Proveedor Asignado' : '✅ Provider Assigned',
        cl.es
          ? `Has asignado un proveedor para ${serviceEs}${cityEs}.`
          : `You've assigned a provider for ${serviceEn}${cityEn}.`,
        { type: 'provider_assigned', jobId: jobRequestId },
      ));
    }
  }

  // Losers
  for (const pid of losingProviderIds) {
    const loser = tokenMap[pid];
    if (loser?.token) {
      pushPromises.push(sendPushNotification(
        loser.token,
        loser.es ? 'ℹ️ Oferta No Seleccionada' : 'ℹ️ Bid Not Selected',
        loser.es
          ? `El cliente seleccionó otro proveedor para el trabajo${cityEs}.`
          : `The client selected another provider for the job${cityEn}.`,
        { type: 'bid_rejected', jobId: jobRequestId },
      ));
    }
  }

  await Promise.allSettled(pushPromises);
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

  const completed = apps
    .filter((a) => a.status === 'accepted')
    .map((a) => jobMap[a.job_request_id])
    .filter((j): j is JobRequest => !!j && j.status === 'completed');

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
  // Verify provider account is approved before allowing bid submission
  const profileTable = providerType === 'company' ? 'companies' : 'independents';
  const { data: profile } = await supabase
    .from(profileTable)
    .select('status')
    .eq('user_id', providerId)
    .maybeSingle();
  if (!profile || profile.status !== 'approved') {
    throw new Error('Your account must be approved before applying to jobs.');
  }

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
