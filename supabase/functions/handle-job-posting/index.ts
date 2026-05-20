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

    // Find matching approved providers
    const { data: providers } = await supabase
      .from('service_areas')
      .select('provider_id, users!inner(push_token, preferred_language, status, role)')
      .eq('city', job.city)
      .filter('users.status', 'eq', 'approved')
      .filter('users.role', 'in', '("company","independent")');

    if (!providers || providers.length === 0) {
      return new Response(JSON.stringify({ message: 'No matching providers' }), { status: 200 });
    }

    const notifications = [];
    const pushMessages = [];

    for (const p of providers as any[]) {
      const user = p.users;
      const lang = user.preferred_language ?? 'en';

      notifications.push({
        user_id: p.provider_id,
        title_en: 'New Job Available!',
        title_es: '¡Nuevo Trabajo Disponible!',
        body_en: `A ${job.service_type} cleaning job in ${job.city} is available.`,
        body_es: `Hay un trabajo de limpieza ${job.service_type === 'commercial' ? 'comercial' : 'residencial'} disponible en ${job.city}.`,
        type: 'new_job',
        data: { job_id: job.id },
      });

      if (user.push_token) {
        pushMessages.push({
          to: user.push_token,
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
