// Supabase Edge Function — check-reminders
// Runs hourly via pg_cron to send 24-hour reminder emails.
//
// Reminders triggered:
//   1. Client: job_requests with status='open' AND no accepted bid AND created >24h ago
//   2. Provider: job_requests with status='in_progress' AND accepted bid AND created >24h ago
//
// Deploy:  supabase functions deploy check-reminders
// pg_cron: SELECT cron.schedule('check-reminders', '0 * * * *',
//            $$SELECT net.http_post(url:=current_setting('app.supabase_url')||'/functions/v1/check-reminders',
//                                   headers:='{"Authorization":"Bearer "||current_setting(''app.service_role_key'')}',
//                                   body:='{}')$$);

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'noreply@provendor.app';
const FROM_NAME = 'ProVendor';

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn('[check-reminders] SENDGRID_API_KEY not set — skipping send to', to);
    return;
  }
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject,
      content: [
        { type: 'text/plain', value: subject },
        { type: 'text/html',  value: html },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`SendGrid ${res.status}: ${body}`);
  }
}

function wrap(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>
  body{margin:0;padding:0;background:#F5F7FA;font-family:'Helvetica Neue',Arial,sans-serif}
  .w{max-width:600px;margin:0 auto;padding:40px 20px}
  .card{background:#FFFFFF;border-radius:16px;padding:40px;border:1px solid #DDE3EC}
  .logo{font-size:22px;font-weight:700;color:#00B4D8;letter-spacing:-.5px;margin-bottom:32px}
  .badge{display:inline-block;background:#E0F7FA;color:#00B4D8;border:1px solid #00B4D8;border-radius:20px;padding:6px 16px;font-size:13px;font-weight:600;margin-bottom:20px}
  h1{font-size:24px;font-weight:700;color:#0D1B2A;margin:0 0 16px;letter-spacing:-.3px}
  p{font-size:15px;line-height:1.7;color:#5A6A7A;margin:0 0 14px}
  .hi{color:#0D1B2A;font-weight:600}
  hr{border:none;border-top:1px solid #DDE3EC;margin:24px 0}
  .foot{margin-top:28px;text-align:center;font-size:12px;color:#9AAAB8}
</style>
</head>
<body>
<div class="w">
  <div class="card">
    <div class="logo">ProVendor</div>
    ${body}
  </div>
  <div class="foot">
    <p>© ${new Date().getFullYear()} ProVendor. All rights reserved.</p>
  </div>
</div>
</body>
</html>`;
}

async function sendPushNotification(token: string, title: string, body: string, data?: Record<string, unknown>): Promise<void> {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ to: token, title, body, data: data ?? {} }),
    });
  } catch (e) {
    console.warn('[check-reminders] push notification failed:', e);
  }
}

// ─── Reminder 1: Clients with open jobs older than 24h and no accepted bid ────

async function remindClients(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: jobs } = await supabase
    .from('job_requests')
    .select('id, city, client_id, created_at')
    .eq('status', 'open')
    .lt('created_at', cutoff);

  if (!jobs?.length) return 0;

  // Filter to jobs with no accepted bid
  const jobIds = jobs.map((j: any) => j.id);
  const { data: acceptedBids } = await supabase
    .from('job_applications')
    .select('job_request_id')
    .in('job_request_id', jobIds)
    .eq('status', 'accepted');

  const acceptedJobIds = new Set((acceptedBids ?? []).map((b: any) => b.job_request_id));
  const unfilledJobs = jobs.filter((j: any) => !acceptedJobIds.has(j.id));
  if (!unfilledJobs.length) return 0;

  let sent = 0;
  for (const job of unfilledJobs as any[]) {
    const [clientAuth, clientProfile] = await Promise.all([
      supabase.auth.admin.getUserById(job.client_id),
      supabase.from('clients').select('preferred_language, push_token').eq('user_id', job.client_id).maybeSingle(),
    ]);
    const clientEmail = clientAuth.data?.user?.email;
    if (!clientEmail) continue;
    const client = { email: clientEmail, preferred_language: clientProfile.data?.preferred_language ?? 'en', push_token: clientProfile.data?.push_token ?? null };

    const es = client.preferred_language === 'es';
    const subject = es
      ? `Recordatorio: Tu trabajo en ${job.city} no tiene proveedor aún`
      : `Reminder: Your job in ${job.city} hasn't been assigned yet`;

    const html = wrap(subject, `
      <div class="badge">${es ? '⏰ Recordatorio' : '⏰ Reminder'}</div>
      <h1>${es ? '¡Tu solicitud sigue abierta!' : 'Your request is still open!'}</h1>
      <p>${es
        ? `Han pasado más de 24 horas desde que publicaste tu trabajo en <span class="hi">${job.city}</span> y aún no has seleccionado un proveedor.`
        : `It's been over 24 hours since you posted your job in <span class="hi">${job.city}</span> and you haven't selected a provider yet.`}</p>
      <hr/>
      <p>${es
        ? 'Abre la app ProVendor para revisar las ofertas recibidas y seleccionar tu proveedor.'
        : 'Open the ProVendor app to review the bids you received and select your provider.'}</p>
    `);

    try {
      await sendEmail(client.email, subject, html);
      if (client.push_token) {
        await sendPushNotification(
          client.push_token,
          es ? '⏰ Recordatorio de Trabajo' : '⏰ Job Reminder',
          es ? `Tu trabajo en ${job.city} aún no tiene proveedor.` : `Your job in ${job.city} still needs a provider.`,
          { jobId: job.id, type: 'client_reminder' },
        );
      }
      sent++;
    } catch (e) {
      console.error('[check-reminders] client reminder error for job', job.id, e);
    }
  }
  return sent;
}

// ─── Reminder 2: Providers with in_progress jobs older than 24h ────────────

async function remindProviders(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Find job_applications where status='accepted' and the job is 'in_progress' and updated >24h ago
  const { data: jobs } = await supabase
    .from('job_requests')
    .select('id, city, created_at')
    .eq('status', 'in_progress')
    .lt('created_at', cutoff);

  if (!jobs?.length) return 0;

  const jobIds = jobs.map((j: any) => j.id);
  const { data: apps } = await supabase
    .from('job_applications')
    .select('job_request_id, provider_id')
    .in('job_request_id', jobIds)
    .eq('status', 'accepted');

  if (!apps?.length) return 0;

  let sent = 0;
  for (const app of apps as any[]) {
    const job = (jobs as any[]).find((j) => j.id === app.job_request_id);
    if (!job) continue;

    const [provAuth, compProf, indProf] = await Promise.all([
      supabase.auth.admin.getUserById(app.provider_id),
      supabase.from('companies').select('preferred_language, push_token').eq('user_id', app.provider_id).maybeSingle(),
      supabase.from('independents').select('preferred_language, push_token').eq('user_id', app.provider_id).maybeSingle(),
    ]);
    const provEmail = provAuth.data?.user?.email;
    if (!provEmail) continue;
    const provProfile = compProf.data ?? indProf.data;
    const provider = { email: provEmail, preferred_language: provProfile?.preferred_language ?? 'en', push_token: provProfile?.push_token ?? null };

    const es = provider.preferred_language === 'es';
    const subject = es
      ? `Recordatorio: Marca tu trabajo en ${job.city} como completado`
      : `Reminder: Mark your job in ${job.city} as completed`;

    const html = wrap(subject, `
      <div class="badge">${es ? '⏰ Recordatorio' : '⏰ Reminder'}</div>
      <h1>${es ? '¿Completaste el trabajo?' : 'Did you complete the job?'}</h1>
      <p>${es
        ? `Han pasado más de 24 horas desde que tu trabajo en <span class="hi">${job.city}</span> está en progreso. Recuerda marcarlo como completado cuando termines.`
        : `It's been over 24 hours since your job in <span class="hi">${job.city}</span> started. Remember to mark it as completed when you're done.`}</p>
      <hr/>
      <p>${es
        ? 'Abre la app ProVendor para actualizar el estado del trabajo.'
        : 'Open the ProVendor app to update the job status.'}</p>
    `);

    try {
      await sendEmail(provider.email, subject, html);
      if (provider.push_token) {
        await sendPushNotification(
          provider.push_token,
          es ? '⏰ Recordatorio de Trabajo' : '⏰ Job Reminder',
          es ? `¿Completaste el trabajo en ${job.city}?` : `Did you complete the job in ${job.city}?`,
          { jobId: job.id, type: 'provider_reminder' },
        );
      }
      sent++;
    } catch (e) {
      console.error('[check-reminders] provider reminder error for app', app.provider_id, e);
    }
  }
  return sent;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const [clientsSent, providersSent] = await Promise.all([
      remindClients(),
      remindProviders(),
    ]);
    return new Response(
      JSON.stringify({ ok: true, clientsSent, providersSent }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[check-reminders]', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
