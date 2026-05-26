import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

serve(async (req) => {
  try {
    const { record } = await req.json();
    const job = record as {
      id: string;
      city: string;
      state: string;
      service_type: string;
      client_id: string;
      scheduled_date: string;
      estimated_hours: number;
    };

    // Set expires_at = now() + 2 hours
    await supabase
      .from('job_requests')
      .update({ expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() })
      .eq('id', job.id);

    // Find matching providers in the same city and state
    const { data: areas } = await supabase
      .from('service_areas')
      .select('provider_id')
      .eq('city', job.city)
      .eq('state', job.state);

    if (!areas || areas.length === 0) {
      return new Response(JSON.stringify({ message: 'No matching providers' }), { status: 200 });
    }

    const allProviderIds = [...new Set(areas.map((a: any) => a.provider_id as string))];

    // Fetch approved+available provider info from profile tables
    const [companiesRes, indepRes] = await Promise.all([
      supabase.from('companies').select('user_id, push_token, preferred_language').in('user_id', allProviderIds).eq('status', 'approved').eq('available', true),
      supabase.from('independents').select('user_id, push_token, preferred_language').in('user_id', allProviderIds).eq('status', 'approved').eq('available', true),
    ]);
    const providerMap: Record<string, { push_token: string | null; preferred_language: string }> = {};
    for (const c of companiesRes.data ?? []) providerMap[c.user_id] = c;
    for (const i of indepRes.data ?? []) providerMap[i.user_id] = i;

    const matchedIds = allProviderIds.filter((id) => providerMap[id]);
    if (!matchedIds.length) {
      return new Response(JSON.stringify({ message: 'No approved providers' }), { status: 200 });
    }

    const notifications = [];
    const pushMessages = [];

    for (const providerId of matchedIds) {
      const provider = providerMap[providerId];
      const lang = provider.preferred_language ?? 'en';

      notifications.push({
        user_id: providerId,
        title_en: 'New Job Available!',
        title_es: '¡Nuevo Trabajo Disponible!',
        body_en: `A ${job.service_type} cleaning job in ${job.city} is available.`,
        body_es: `Hay un trabajo de limpieza ${job.service_type === 'commercial' ? 'comercial' : 'residencial'} disponible en ${job.city}.`,
        type: 'new_job',
        data: { job_id: job.id },
      });

      if (provider.push_token) {
        pushMessages.push({
          to: provider.push_token,
          title: lang === 'es' ? '¡Nuevo Trabajo Disponible!' : 'New Job Available!',
          body: lang === 'es'
            ? `Trabajo de limpieza en ${job.city}`
            : `Cleaning job in ${job.city}`,
          data: { job_id: job.id, screen: 'job_details' },
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

    return new Response(JSON.stringify({ sent: pushMessages.length }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
