import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (_req) => {
  try {
    // Find expired open jobs
    const { data: expiredJobs } = await supabase
      .from('job_requests')
      .select('id, client_id, city')
      .eq('status', 'open')
      .lt('expires_at', new Date().toISOString());

    if (!expiredJobs || expiredJobs.length === 0) {
      return new Response(JSON.stringify({ expired: 0 }), { status: 200 });
    }

    // Update all to expired
    const ids = expiredJobs.map((j: any) => j.id);
    await supabase
      .from('job_requests')
      .update({ status: 'expired' })
      .in('id', ids);

    // Fetch client info from clients table
    const clientIds = [...new Set(expiredJobs.map((j: any) => j.client_id).filter(Boolean))];
    const { data: clientRows } = clientIds.length > 0
      ? await supabase.from('clients').select('user_id, push_token, preferred_language').in('user_id', clientIds)
      : { data: [] as any[] };
    const clientMap = Object.fromEntries((clientRows ?? []).map((c: any) => [c.user_id, c]));

    // Notify clients
    const pushMessages = [];
    const notifications = [];

    for (const job of expiredJobs as any[]) {
      const client = clientMap[job.client_id];
      const lang = client?.preferred_language ?? 'en';
      notifications.push({
        user_id: job.client_id,
        title_en: 'Job Expired',
        title_es: 'Trabajo Expirado',
        body_en: 'Your cleaning job in ' + job.city + ' received no applicants. Try reposting.',
        body_es: 'Tu trabajo de limpieza en ' + job.city + ' no recibió aplicaciones. Intenta publicar de nuevo.',
        type: 'job_expired',
        data: { job_id: job.id },
      });
      if (client?.push_token) {
        pushMessages.push({
          to: client.push_token,
          title: lang === 'es' ? 'Trabajo Expirado' : 'Job Expired',
          body: lang === 'es'
            ? 'Tu publicación expiró sin aplicaciones. ¡Vuelve a publicar!'
            : 'Your job posting expired with no applicants. Try reposting!',
          data: { screen: 'my_requests' },
        });
      }
    }

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }
    if (pushMessages.length > 0) {
      await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(pushMessages),
      });
    }

    return new Response(JSON.stringify({ expired: ids.length }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
