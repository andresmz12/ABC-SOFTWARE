// Supabase Edge Function — send-email
// Runtime: Deno (not Node.js). @sendgrid/mail is a Node package; we call the
// SendGrid REST API directly via fetch, which is the correct pattern for Deno
// edge functions and avoids CJS compatibility issues.
//
// Secrets required (set via `supabase secrets set` or the Supabase dashboard):
//   SENDGRID_API_KEY   — your SendGrid API key
//   FROM_EMAIL         — verified sender address, e.g. noreply@yourapp.com

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') ?? '';
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'noreply@provendor.app';
const FROM_NAME = 'ProVendor';

// ─── SendGrid helper ──────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.warn('[send-email] SENDGRID_API_KEY not set — skipping send to', to);
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

// ─── Email wrapper / layout ───────────────────────────────────────────────────

function wrap(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>
  body{margin:0;padding:0;background:#0A0A0A;font-family:'Helvetica Neue',Arial,sans-serif}
  .w{max-width:600px;margin:0 auto;padding:40px 20px}
  .card{background:#1A1A1A;border-radius:16px;padding:40px;border:1px solid #2A2A2A}
  .logo{font-size:22px;font-weight:700;color:#C9A84C;letter-spacing:-.5px;margin-bottom:32px}
  .badge{display:inline-block;background:#1E1A0F;color:#C9A84C;border:1px solid #C9A84C;border-radius:20px;padding:6px 16px;font-size:13px;font-weight:600;margin-bottom:20px}
  h1{font-size:24px;font-weight:700;color:#FFF;margin:0 0 16px;letter-spacing:-.3px}
  p{font-size:15px;line-height:1.7;color:#A0A0A0;margin:0 0 14px}
  .hi{color:#FFF}
  hr{border:none;border-top:1px solid #2A2A2A;margin:24px 0}
  .row{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #2A2A2A}
  .lbl{color:#666;font-size:13px}
  .val{color:#FFF;font-size:13px;font-weight:600;text-align:right}
  .foot{margin-top:28px;text-align:center;font-size:12px;color:#444}
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
    <p>You receive this because you have an account with ProVendor.</p>
  </div>
</div>
</body>
</html>`;
}

// ─── Handler: new job posted → find matching providers and email each ─────────

async function handleNewJob(job: any): Promise<{ sent: number }> {
  // 1. Find providers whose service_areas include this job's state (department)
  const { data: areas, error: aErr } = await supabase
    .from('service_areas')
    .select('provider_id')
    .eq('state', job.state);

  if (aErr || !areas?.length) return { sent: 0 };

  const allProviderIds = [...new Set(areas.map((a: any) => a.provider_id as string))];

  // 2. Filter to providers who are currently available
  const [availCompanies, availIndep] = await Promise.all([
    supabase.from('companies').select('user_id').in('user_id', allProviderIds).eq('available', true),
    supabase.from('independents').select('user_id').in('user_id', allProviderIds).eq('available', true),
  ]);
  const providerIds = [
    ...(availCompanies.data ?? []).map((c: any) => c.user_id as string),
    ...(availIndep.data ?? []).map((i: any) => i.user_id as string),
  ];
  if (!providerIds.length) return { sent: 0 };

  // 3. Get approved providers, filtered by service_type eligibility:
  //    commercial → company only; residential → company + independent
  let q = supabase
    .from('users')
    .select('id, email, preferred_language, role')
    .in('id', providerIds)
    .eq('status', 'approved')
    .in('role', ['company', 'independent']);

  if (job.service_type === 'commercial') {
    q = q.eq('role', 'company');
  }

  const { data: providers } = await q;
  if (!providers?.length) return { sent: 0 };

  const isCom = job.service_type === 'commercial';
  let sent = 0;

  for (const p of providers as any[]) {
    const es = p.preferred_language === 'es';
    const kind = isCom
      ? (es ? 'limpieza comercial' : 'commercial cleaning')
      : (es ? 'limpieza residencial' : 'residential cleaning');
    const subject = es
      ? `¡Nuevo trabajo de ${kind} en ${job.city}!`
      : `New ${kind} job in ${job.city}!`;

    const html = wrap(subject, `
      <div class="badge">${es ? '🔔 Nueva Alerta de Trabajo' : '🔔 New Job Alert'}</div>
      <h1>${es ? '¡Hay un nuevo trabajo disponible!' : 'A new job is available!'}</h1>
      <p>${es
        ? `Se publicó un trabajo de <span class="hi">${kind}</span> en tu área de servicio.`
        : `A <span class="hi">${kind}</span> job was posted in your service area.`}</p>
      <hr/>
      <div class="row"><span class="lbl">${es ? 'Tipo' : 'Type'}</span><span class="val">${isCom ? (es ? 'Comercial' : 'Commercial') : (es ? 'Residencial' : 'Residential')}</span></div>
      <div class="row"><span class="lbl">${es ? 'Ciudad' : 'City'}</span><span class="val">${job.city}</span></div>
      <div class="row"><span class="lbl">${es ? 'Dpto./Estado' : 'State/Dept.'}</span><span class="val">${job.state}</span></div>
      <div class="row"><span class="lbl">${es ? 'Fecha' : 'Date'}</span><span class="val">${job.scheduled_date}</span></div>
      <div class="row"><span class="lbl">${es ? 'Duración' : 'Duration'}</span><span class="val">${job.estimated_hours}h</span></div>
      ${job.budget_usd ? `<div class="row"><span class="lbl">${es ? 'Presupuesto' : 'Budget'}</span><span class="val">$${job.budget_usd} USD</span></div>` : ''}
      ${job.budget_cop ? `<div class="row"><span class="lbl">${es ? 'Presupuesto' : 'Budget'}</span><span class="val">$${job.budget_cop} COP</span></div>` : ''}
      <hr/>
      <p>${es
        ? 'Abre la app ProVendor para ver los detalles completos y enviar tu oferta.'
        : 'Open the ProVendor app to view full details and submit your bid.'}</p>
    `);

    try {
      await sendEmail(p.email, subject, html);
      sent++;
    } catch (e) {
      console.error('[send-email] new_job provider', p.id, e);
    }
  }

  return { sent };
}

// ─── Handler: new offer received → email the client ───────────────────────────

async function handleNewOffer(application: any): Promise<void> {
  // Get the job record — only proceed if the job is still open
  const { data: job } = await supabase
    .from('job_requests')
    .select('id, city, service_type, client_id, status')
    .eq('id', application.job_request_id)
    .single();
  if (!job || job.status !== 'open') return;

  // Get the client's email and language
  const { data: clientUser } = await supabase
    .from('users')
    .select('email, preferred_language')
    .eq('id', job.client_id)
    .single();
  if (!clientUser) return;

  // Get the provider's display name
  let providerName = 'Un proveedor';
  if (application.provider_type === 'company') {
    const { data } = await supabase
      .from('companies')
      .select('company_name')
      .eq('user_id', application.provider_id)
      .single();
    providerName = data?.company_name ?? providerName;
  } else {
    const { data } = await supabase
      .from('independents')
      .select('full_name')
      .eq('user_id', application.provider_id)
      .single();
    providerName = data?.full_name ?? providerName;
  }

  const es = clientUser.preferred_language === 'es';
  const bidText = application.bid_amount_usd
    ? `$${application.bid_amount_usd} USD`
    : application.bid_amount_cop
    ? `$${application.bid_amount_cop} COP`
    : '—';

  const subject = es
    ? `Nueva oferta recibida para tu solicitud en ${job.city}`
    : `New bid received for your request in ${job.city}`;

  const html = wrap(subject, `
    <div class="badge">${es ? '💼 Nueva Oferta' : '💼 New Bid Received'}</div>
    <h1>${es ? '¡Recibiste una nueva oferta!' : 'You received a new bid!'}</h1>
    <p>${es
      ? `<span class="hi">${providerName}</span> envió una oferta para tu solicitud de limpieza en ${job.city}.`
      : `<span class="hi">${providerName}</span> submitted a bid for your cleaning request in ${job.city}.`}</p>
    <hr/>
    <div class="row"><span class="lbl">${es ? 'Proveedor' : 'Provider'}</span><span class="val">${providerName}</span></div>
    <div class="row"><span class="lbl">${es ? 'Tipo' : 'Type'}</span><span class="val">${application.provider_type === 'company' ? (es ? 'Empresa' : 'Company') : (es ? 'Independiente' : 'Independent')}</span></div>
    <div class="row"><span class="lbl">${es ? 'Oferta' : 'Bid'}</span><span class="val">${bidText}</span></div>
    ${application.message ? `<div class="row"><span class="lbl">${es ? 'Mensaje' : 'Message'}</span><span class="val" style="max-width:55%;word-break:break-word">"${application.message}"</span></div>` : ''}
    <hr/>
    <p>${es
      ? 'Abre la app ProVendor para revisar la oferta y aceptarla.'
      : 'Open the ProVendor app to review this bid and accept it.'}</p>
  `);

  await sendEmail(clientUser.email, subject, html);
}

// ─── Handler: offer accepted → email the provider ─────────────────────────────

async function handleOfferAccepted(application: any): Promise<void> {
  const { data: providerUser } = await supabase
    .from('users')
    .select('email, preferred_language')
    .eq('id', application.provider_id)
    .single();
  if (!providerUser) return;

  const { data: job } = await supabase
    .from('job_requests')
    .select('city, scheduled_date, estimated_hours, service_type')
    .eq('id', application.job_request_id)
    .single();

  const es = providerUser.preferred_language === 'es';
  const bidText = application.bid_amount_usd
    ? `$${application.bid_amount_usd} USD`
    : application.bid_amount_cop
    ? `$${application.bid_amount_cop} COP`
    : '—';

  const subject = es
    ? `¡Tu oferta fue aceptada! Trabajo en ${job?.city ?? ''}`
    : `Your bid was accepted! Job in ${job?.city ?? ''}`;

  const html = wrap(subject, `
    <div class="badge">${es ? '✅ Oferta Aceptada' : '✅ Bid Accepted'}</div>
    <h1>${es ? '¡Tu oferta fue aceptada!' : 'Your bid was accepted!'}</h1>
    <p>${es
      ? `El cliente aceptó tu oferta de <span class="hi">${bidText}</span>. ¡Prepárate para comenzar!`
      : `The client accepted your bid of <span class="hi">${bidText}</span>. Get ready to start!`}</p>
    ${job ? `
    <hr/>
    <div class="row"><span class="lbl">${es ? 'Ciudad' : 'City'}</span><span class="val">${job.city}</span></div>
    <div class="row"><span class="lbl">${es ? 'Fecha' : 'Date'}</span><span class="val">${job.scheduled_date}</span></div>
    <div class="row"><span class="lbl">${es ? 'Duración' : 'Duration'}</span><span class="val">${job.estimated_hours}h</span></div>
    <div class="row"><span class="lbl">${es ? 'Tu oferta' : 'Your bid'}</span><span class="val">${bidText}</span></div>` : ''}
    <hr/>
    <p>${es
      ? 'Abre la app ProVendor para coordinar los detalles con el cliente.'
      : 'Open the ProVendor app to coordinate details with the client.'}</p>
  `);

  await sendEmail(providerUser.email, subject, html);
}

// ─── Handler: admin approves or rejects a provider ───────────────────────────

async function handleProviderStatus(user: any, status: 'approved' | 'rejected'): Promise<void> {
  const es = user.preferred_language === 'es';

  if (status === 'approved') {
    const subject = es
      ? '¡Tu cuenta ProVendor fue aprobada!'
      : 'Your ProVendor account has been approved!';

    const html = wrap(subject, `
      <div class="badge">${es ? '🎉 Cuenta Aprobada' : '🎉 Account Approved'}</div>
      <h1>${es ? '¡Bienvenido a ProVendor!' : 'Welcome to ProVendor!'}</h1>
      <p>${es
        ? 'Tu cuenta fue revisada y aprobada. Ya puedes ver trabajos disponibles en tu área y enviar ofertas.'
        : 'Your account has been reviewed and approved. You can now browse available jobs in your area and submit bids.'}</p>
      <hr/>
      <p>${es
        ? 'Abre la app, revisa las Alertas de Trabajo en tu departamento y empieza a aplicar.'
        : 'Open the app, check the Job Alerts in your area, and start applying.'}</p>
    `);

    await sendEmail(user.email, subject, html);
  } else {
    const subject = es
      ? 'Actualización sobre tu solicitud en ProVendor'
      : 'Update on your ProVendor application';

    const html = wrap(subject, `
      <div class="badge">${es ? 'ℹ️ Estado de Cuenta' : 'ℹ️ Account Status'}</div>
      <h1>${es ? 'Solicitud no aprobada' : 'Application not approved'}</h1>
      <p>${es
        ? 'Revisamos tu solicitud y en este momento no pudimos aprobar tu cuenta.'
        : 'We reviewed your application and were unable to approve your account at this time.'}</p>
      <hr/>
      <p>${es
        ? 'Si crees que hay un error o tienes preguntas, por favor responde a este correo.'
        : 'If you believe this is a mistake or have questions, please reply to this email.'}</p>
    `);

    await sendEmail(user.email, subject, html);
  }
}

// ─── Handler: welcome email on registration ───────────────────────────────────

async function handleWelcome(user: any): Promise<void> {
  const es = user.preferred_language === 'es';
  const isClient = user.role === 'client';

  const subject = es ? '¡Bienvenido a ProVendor!' : 'Welcome to ProVendor!';

  const html = wrap(subject, `
    <div class="badge">${es ? '👋 Bienvenido' : '👋 Welcome'}</div>
    <h1>${es ? '¡Gracias por unirte a ProVendor!' : 'Thanks for joining ProVendor!'}</h1>
    <p>${es
      ? 'Tu cuenta fue creada exitosamente. Aquí está lo que puedes hacer:'
      : 'Your account was created successfully. Here\'s what you can do next:'}</p>
    <hr/>
    ${isClient ? `
    <p>• <span class="hi">${es ? 'Publica trabajos' : 'Post jobs'}</span> — ${es
      ? 'Describe el servicio que necesitas y recibe ofertas de proveedores verificados.'
      : 'Describe the cleaning service you need and receive bids from verified providers.'}</p>
    <p>• <span class="hi">${es ? 'Compara ofertas' : 'Compare bids'}</span> — ${es
      ? 'Revisa precios, perfiles y calificaciones antes de elegir.'
      : 'Review prices, profiles and ratings before making a choice.'}</p>` : `
    <p>• <span class="hi">${es ? 'Completa tu perfil' : 'Complete your profile'}</span> — ${es
      ? 'Agrega tus áreas de servicio y sube tus documentos para ser aprobado.'
      : 'Add your service areas and upload your documents to get approved.'}</p>
    <p>• <span class="hi">${es ? 'Espera la aprobación' : 'Wait for approval'}</span> — ${es
      ? 'Te notificaremos por email cuando tu cuenta sea aprobada.'
      : 'We\'ll email you as soon as your account is approved.'}</p>`}
    <hr/>
    <p>${es ? 'Abre la app para comenzar.' : 'Open the app to get started.'}</p>
  `);

  await sendEmail(user.email, subject, html);
}

// ─── Handler: offer rejected → email the losing provider ─────────────────────

async function handleOfferRejected(application: any): Promise<void> {
  const { data: providerUser } = await supabase
    .from('users')
    .select('email, preferred_language')
    .eq('id', application.provider_id)
    .single();
  if (!providerUser) return;

  const { data: job } = await supabase
    .from('job_requests')
    .select('city, service_type')
    .eq('id', application.job_request_id)
    .single();

  const es = providerUser.preferred_language === 'es';
  const subject = es
    ? 'Actualización sobre tu oferta en ProVendor'
    : 'Update on your ProVendor bid';

  const html = wrap(subject, `
    <div class="badge">${es ? 'ℹ️ Oferta No Seleccionada' : 'ℹ️ Bid Not Selected'}</div>
    <h1>${es ? 'El cliente seleccionó otro proveedor' : 'The client selected another provider'}</h1>
    <p>${es
      ? `Gracias por tu interés. El cliente eligió otro proveedor para el trabajo${job?.city ? ` en ${job.city}` : ''}.`
      : `Thank you for your interest. The client chose another provider for the job${job?.city ? ` in ${job.city}` : ''}.`}</p>
    <hr/>
    <p>${es
      ? '¡No te desanimes! Sigue aplicando a nuevos trabajos en tu área.'
      : "Don't be discouraged! Keep applying to new jobs in your area."}</p>
  `);

  await sendEmail(providerUser.email, subject, html);
}

// ─── Handler: job completed → email both client and provider ─────────────────

async function handleJobCompleted(job: any): Promise<void> {
  // Email the client
  const { data: client } = await supabase
    .from('users')
    .select('email, preferred_language')
    .eq('id', job.client_id)
    .single();

  if (client) {
    const es = client.preferred_language === 'es';
    const subject = es ? `Trabajo completado en ${job.city}` : `Job completed in ${job.city}`;
    const html = wrap(subject, `
      <div class="badge">${es ? '✅ Trabajo Completado' : '✅ Job Completed'}</div>
      <h1>${es ? '¡Tu servicio fue completado!' : 'Your service has been completed!'}</h1>
      <p>${es
        ? `El proveedor ha completado el trabajo de limpieza en <span class="hi">${job.city}</span>. Abre la app para dejar tu calificación.`
        : `The provider has completed the cleaning job in <span class="hi">${job.city}</span>. Open the app to leave your review.`}</p>
    `);
    await sendEmail(client.email, subject, html);
  }

  // Email the provider
  const { data: acceptedApp } = await supabase
    .from('job_applications')
    .select('provider_id')
    .eq('job_request_id', job.id)
    .eq('status', 'accepted')
    .single();

  if (acceptedApp) {
    const { data: provider } = await supabase
      .from('users')
      .select('email, preferred_language')
      .eq('id', acceptedApp.provider_id)
      .single();

    if (provider) {
      const es = provider.preferred_language === 'es';
      const subject = es ? `Trabajo completado — ¡Buen trabajo!` : `Job completed — Great work!`;
      const html = wrap(subject, `
        <div class="badge">${es ? '🎉 ¡Completado!' : '🎉 Completed!'}</div>
        <h1>${es ? '¡Buen trabajo!' : 'Great work!'}</h1>
        <p>${es
          ? `El trabajo en <span class="hi">${job.city}</span> ha sido marcado como completado. El cliente recibirá una notificación para dejar su calificación.`
          : `The job in <span class="hi">${job.city}</span> has been marked as completed. The client will receive a notification to leave their review.`}</p>
      `);
      await sendEmail(provider.email, subject, html);
    }
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

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
    const { type, data } = await req.json();

    switch (type) {
      case 'new_job': {
        const result = await handleNewJob(data);
        return new Response(JSON.stringify(result), { status: 200 });
      }
      case 'new_offer': {
        await handleNewOffer(data);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      case 'offer_accepted': {
        await handleOfferAccepted(data);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      case 'provider_approved': {
        await handleProviderStatus(data, 'approved');
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      case 'provider_rejected': {
        await handleProviderStatus(data, 'rejected');
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      case 'welcome': {
        await handleWelcome(data);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      case 'offer_rejected': {
        await handleOfferRejected(data);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      case 'job_completed': {
        await handleJobCompleted(data);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      default:
        return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), { status: 400 });
    }
  } catch (err) {
    console.error('[send-email]', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
