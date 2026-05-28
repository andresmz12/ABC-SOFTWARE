// Supabase Edge Function — send-email
// Runtime: Deno. Calls SendGrid REST API directly (no Node packages).
// Secrets: SENDGRID_API_KEY, FROM_EMAIL (fallback: info@ismconsultores.com)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY') ?? '';
const FROM_EMAIL       = Deno.env.get('FROM_EMAIL') ?? 'info@ismconsultores.com';
const FROM_NAME        = 'ProVendor';

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

// ─── HTML layout ─────────────────────────────────────────────────────────────

function wrap(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${title}</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;padding:0;background:#F0F4F8;font-family:'Helvetica Neue',Arial,sans-serif}
  .w{max-width:600px;margin:0 auto;padding:32px 16px}
  .hd{background:linear-gradient(135deg,#00BCD4 0%,#0097A7 100%);border-radius:16px 16px 0 0;padding:28px 32px;display:flex;align-items:center;gap:12px}
  .logo{font-size:22px;font-weight:800;color:#FFF;letter-spacing:-.5px}
  .logo-dot{width:8px;height:8px;background:rgba(255,255,255,.5);border-radius:50%;display:inline-block;margin-left:2px;vertical-align:middle}
  .card{background:#FFF;border-radius:0 0 16px 16px;padding:32px;box-shadow:0 4px 20px rgba(0,188,212,.08)}
  .badge{display:inline-block;background:#E0F7FA;color:#00838F;border-radius:20px;padding:5px 14px;font-size:12px;font-weight:700;letter-spacing:.3px;margin-bottom:16px}
  h1{font-size:22px;font-weight:700;color:#1A2332;margin:0 0 12px;line-height:1.35}
  p{font-size:15px;line-height:1.7;color:#5A6475;margin:0 0 12px}
  .hi{color:#1A2332;font-weight:600}
  .teal{color:#00BCD4;font-weight:600}
  hr{border:none;border-top:1px solid #EEF1F5;margin:22px 0}
  .row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;border-bottom:1px solid #F5F7FA}
  .row:last-child{border-bottom:none}
  .lbl{color:#94A3B8;font-size:13px}
  .val{color:#1A2332;font-size:13px;font-weight:600;text-align:right;max-width:60%}
  .cta{display:inline-block;background:#00BCD4;color:#FFF!important;border-radius:10px;padding:13px 30px;font-size:15px;font-weight:700;text-decoration:none;margin-top:8px;letter-spacing:.2px}
  .info-box{background:#F0FDFF;border-left:3px solid #00BCD4;border-radius:0 8px 8px 0;padding:14px 16px;margin:16px 0}
  .info-box p{margin:0;color:#1A2332;font-size:14px}
  .foot{text-align:center;padding:24px 0 0;color:#94A3B8;font-size:12px;line-height:1.6}
</style>
</head>
<body>
<div class="w">
  <div class="hd">
    <div class="logo">ProVendor<span class="logo-dot"></span></div>
  </div>
  <div class="card">
    ${body}
  </div>
  <div class="foot">
    <p>© ${new Date().getFullYear()} ProVendor · <a href="mailto:info@ismconsultores.com" style="color:#00BCD4;text-decoration:none">info@ismconsultores.com</a></p>
    <p>Recibes este correo porque tienes una cuenta en ProVendor.<br/>You receive this because you have an account with ProVendor.</p>
  </div>
</div>
</body>
</html>`;
}

// ─── Handler: new job posted → find matching providers and email each ─────────

async function handleNewJob(job: any): Promise<{ sent: number }> {
  const { data: areas, error: aErr } = await supabase
    .from('service_areas')
    .select('provider_id')
    .eq('state', job.state);
  if (aErr || !areas?.length) return { sent: 0 };

  const allProviderIds = [...new Set(areas.map((a: any) => a.provider_id as string))];

  const [companiesRes, independentsRes] = await Promise.all([
    supabase.from('companies').select('user_id, preferred_language').in('user_id', allProviderIds).eq('status', 'approved').eq('available', true),
    supabase.from('independents').select('user_id, preferred_language').in('user_id', allProviderIds).eq('status', 'approved').eq('available', true),
  ]);

  const isCom = job.service_type === 'commercial';
  let providerRows: Array<{ user_id: string; preferred_language: string }> = [
    ...(companiesRes.data ?? []).map((c: any) => ({ user_id: c.user_id, preferred_language: c.preferred_language ?? 'en' })),
  ];
  if (!isCom) {
    providerRows = [
      ...providerRows,
      ...((independentsRes as any).data ?? []).map((i: any) => ({ user_id: i.user_id, preferred_language: i.preferred_language ?? 'en' })),
    ];
  }
  if (!providerRows.length) return { sent: 0 };

  let sent = 0;
  for (const p of providerRows) {
    const { data: authUser } = await supabase.auth.admin.getUserById(p.user_id);
    const email = authUser?.user?.email;
    if (!email) continue;
    const es = p.preferred_language === 'es';
    const kind = isCom ? (es ? 'limpieza comercial' : 'commercial cleaning') : (es ? 'limpieza residencial' : 'residential cleaning');
    const subject = es ? `🔔 Nuevo trabajo de ${kind} en ${job.city}` : `🔔 New ${kind} job in ${job.city}`;
    const budgetRow = job.budget_usd
      ? `<div class="row"><span class="lbl">${es ? 'Presupuesto' : 'Budget'}</span><span class="val">$${job.budget_usd} USD</span></div>`
      : job.budget_cop
      ? `<div class="row"><span class="lbl">${es ? 'Presupuesto' : 'Budget'}</span><span class="val">$${job.budget_cop} COP</span></div>`
      : '';
    const html = wrap(subject, `
      <div class="badge">🔔 ${es ? 'Nueva Alerta de Trabajo' : 'New Job Alert'}</div>
      <h1>${es ? '¡Hay un nuevo trabajo disponible!' : 'A new job is available!'}</h1>
      <p>${es
        ? `Se publicó un trabajo de <span class="teal">${kind}</span> en tu área de servicio.`
        : `A <span class="teal">${kind}</span> job was posted in your service area.`}</p>
      <hr/>
      <div class="row"><span class="lbl">${es ? 'Tipo' : 'Type'}</span><span class="val">${isCom ? (es ? 'Comercial' : 'Commercial') : (es ? 'Residencial' : 'Residential')}</span></div>
      <div class="row"><span class="lbl">${es ? 'Ciudad' : 'City'}</span><span class="val">${job.city}</span></div>
      <div class="row"><span class="lbl">${es ? 'Dpto./Estado' : 'State/Dept.'}</span><span class="val">${job.state ?? '—'}</span></div>
      <div class="row"><span class="lbl">${es ? 'Fecha' : 'Date'}</span><span class="val">${job.scheduled_date}</span></div>
      <div class="row"><span class="lbl">${es ? 'Duración' : 'Duration'}</span><span class="val">${job.estimated_hours}h</span></div>
      ${budgetRow}
      <hr/>
      <div class="info-box"><p>${es ? '👆 Abre la app ProVendor para ver los detalles y enviar tu oferta.' : '👆 Open the ProVendor app to view full details and submit your bid.'}</p></div>
    `);
    try {
      await sendEmail(email, subject, html);
      sent++;
    } catch (e) {
      console.error('[send-email] new_job provider', p.user_id, e);
    }
  }
  return { sent };
}

// ─── Handler: new offer → email client ───────────────────────────────────────

async function handleNewOffer(application: any): Promise<void> {
  const { data: job } = await supabase
    .from('job_requests')
    .select('id, city, service_type, client_id, status')
    .eq('id', application.job_request_id)
    .single();
  if (!job || job.status !== 'open') return;

  const [clientAuth, clientProfile] = await Promise.all([
    supabase.auth.admin.getUserById(job.client_id),
    supabase.from('clients').select('preferred_language').eq('user_id', job.client_id).maybeSingle(),
  ]);
  const clientEmail = clientAuth.data?.user?.email;
  if (!clientEmail) return;
  const es = (clientProfile.data?.preferred_language ?? 'en') === 'es';

  let providerName = es ? 'Un proveedor' : 'A provider';
  if (application.provider_type === 'company') {
    const { data } = await supabase.from('companies').select('company_name').eq('user_id', application.provider_id).single();
    providerName = data?.company_name ?? providerName;
  } else {
    const { data } = await supabase.from('independents').select('full_name').eq('user_id', application.provider_id).single();
    providerName = data?.full_name ?? providerName;
  }

  const bidText = application.bid_amount_usd
    ? `$${application.bid_amount_usd} USD`
    : application.bid_amount_cop
    ? `$${application.bid_amount_cop} COP`
    : '—';

  const subject = es
    ? `💼 Nueva oferta de ${providerName} para tu trabajo en ${job.city}`
    : `💼 New bid from ${providerName} for your job in ${job.city}`;

  const html = wrap(subject, `
    <div class="badge">💼 ${es ? 'Nueva Oferta' : 'New Bid Received'}</div>
    <h1>${es ? '¡Recibiste una nueva oferta!' : 'You received a new bid!'}</h1>
    <p>${es
      ? `<span class="hi">${providerName}</span> envió una oferta para tu solicitud de limpieza en <span class="teal">${job.city}</span>.`
      : `<span class="hi">${providerName}</span> submitted a bid for your cleaning request in <span class="teal">${job.city}</span>.`}</p>
    <hr/>
    <div class="row"><span class="lbl">${es ? 'Proveedor' : 'Provider'}</span><span class="val">${providerName}</span></div>
    <div class="row"><span class="lbl">${es ? 'Tipo' : 'Type'}</span><span class="val">${application.provider_type === 'company' ? (es ? 'Empresa' : 'Company') : (es ? 'Independiente' : 'Independent')}</span></div>
    <div class="row"><span class="lbl">${es ? 'Oferta' : 'Bid'}</span><span class="val">${bidText}</span></div>
    ${application.message ? `<div class="row"><span class="lbl">${es ? 'Mensaje' : 'Message'}</span><span class="val">"${application.message}"</span></div>` : ''}
    <hr/>
    <div class="info-box"><p>${es ? '👆 Abre la app para revisar la oferta y aceptarla.' : '👆 Open the app to review this bid and accept it.'}</p></div>
  `);

  await sendEmail(clientEmail, subject, html);
}

// ─── Handler: offer accepted → email provider ────────────────────────────────

async function handleOfferAccepted(application: any): Promise<void> {
  const [providerAuth, companyProfile, indProfile] = await Promise.all([
    supabase.auth.admin.getUserById(application.provider_id),
    supabase.from('companies').select('preferred_language').eq('user_id', application.provider_id).maybeSingle(),
    supabase.from('independents').select('preferred_language').eq('user_id', application.provider_id).maybeSingle(),
  ]);
  const providerEmail = providerAuth.data?.user?.email;
  if (!providerEmail) return;
  const es = ((companyProfile.data ?? indProfile.data)?.preferred_language ?? 'en') === 'es';

  const { data: job } = await supabase
    .from('job_requests')
    .select('city, scheduled_date, estimated_hours, service_type, address')
    .eq('id', application.job_request_id)
    .single();

  const bidText = application.bid_amount_usd
    ? `$${application.bid_amount_usd} USD`
    : application.bid_amount_cop
    ? `$${application.bid_amount_cop} COP`
    : '—';

  const subject = es
    ? `✅ ¡Tu oferta fue aceptada! Trabajo en ${job?.city ?? ''}`
    : `✅ Your bid was accepted! Job in ${job?.city ?? ''}`;

  const html = wrap(subject, `
    <div class="badge">✅ ${es ? 'Oferta Aceptada' : 'Bid Accepted'}</div>
    <h1>${es ? '¡Tu oferta fue aceptada!' : 'Your bid was accepted!'}</h1>
    <p>${es
      ? `El cliente aceptó tu oferta de <span class="teal">${bidText}</span>. ¡Prepárate para comenzar!`
      : `The client accepted your bid of <span class="teal">${bidText}</span>. Get ready to start!`}</p>
    ${job ? `
    <hr/>
    <div class="row"><span class="lbl">${es ? 'Ciudad' : 'City'}</span><span class="val">${job.city}</span></div>
    ${job.address ? `<div class="row"><span class="lbl">${es ? 'Dirección' : 'Address'}</span><span class="val">${job.address}</span></div>` : ''}
    <div class="row"><span class="lbl">${es ? 'Fecha' : 'Date'}</span><span class="val">${job.scheduled_date}</span></div>
    <div class="row"><span class="lbl">${es ? 'Duración estimada' : 'Est. Duration'}</span><span class="val">${job.estimated_hours}h</span></div>
    <div class="row"><span class="lbl">${es ? 'Tu oferta' : 'Your bid'}</span><span class="val">${bidText}</span></div>` : ''}
    <hr/>
    <div class="info-box"><p>${es ? '👆 Abre la app para coordinar los detalles con el cliente antes de la fecha programada.' : '👆 Open the app to coordinate details with the client before the scheduled date.'}</p></div>
  `);

  await sendEmail(providerEmail, subject, html);
}

// ─── Handler: provider approved / rejected ────────────────────────────────────

async function handleProviderStatus(user: any, status: 'approved' | 'rejected'): Promise<void> {
  const es = (user.preferred_language ?? 'en') === 'es';

  if (status === 'approved') {
    const subject = es ? '🎉 ¡Tu cuenta ProVendor fue aprobada!' : '🎉 Your ProVendor account has been approved!';
    const html = wrap(subject, `
      <div class="badge">🎉 ${es ? 'Cuenta Aprobada' : 'Account Approved'}</div>
      <h1>${es ? '¡Bienvenido a ProVendor!' : 'Welcome to ProVendor!'}</h1>
      <p>${es
        ? 'Tu cuenta fue revisada y <span class="teal">aprobada exitosamente</span>. Ya puedes ver trabajos disponibles en tu área y enviar ofertas.'
        : 'Your account has been reviewed and <span class="teal">successfully approved</span>. You can now browse available jobs in your area and submit bids.'}</p>
      <hr/>
      <p>• ${es ? '<span class="hi">Revisa las alertas de trabajo</span> en tu departamento.' : '<span class="hi">Check Job Alerts</span> in your service area.'}</p>
      <p>• ${es ? '<span class="hi">Envía ofertas</span> a los trabajos que te interesen.' : '<span class="hi">Submit bids</span> on jobs that interest you.'}</p>
      <p>• ${es ? 'Activa <span class="hi">disponibilidad</span> para aparecer en las búsquedas.' : 'Enable <span class="hi">availability</span> to appear in client searches.'}</p>
      <hr/>
      <div class="info-box"><p>${es ? '👆 Abre la app ProVendor para empezar a recibir trabajos.' : '👆 Open the ProVendor app to start receiving jobs.'}</p></div>
    `);
    await sendEmail(user.email, subject, html);
  } else {
    const subject = es ? 'Actualización sobre tu solicitud en ProVendor' : 'Update on your ProVendor application';
    const html = wrap(subject, `
      <div class="badge">ℹ️ ${es ? 'Estado de Cuenta' : 'Account Status'}</div>
      <h1>${es ? 'Solicitud no aprobada' : 'Application not approved'}</h1>
      <p>${es
        ? 'Revisamos tu solicitud y en este momento no pudimos aprobar tu cuenta.'
        : 'We reviewed your application and were unable to approve your account at this time.'}</p>
      <hr/>
      <p>${es
        ? 'Si crees que hay un error o tienes preguntas, por favor contáctanos respondiendo este correo.'
        : 'If you believe this is a mistake or have questions, please contact us by replying to this email.'}</p>
    `);
    await sendEmail(user.email, subject, html);
  }
}

// ─── Handler: welcome email on registration ───────────────────────────────────

async function handleWelcome(user: any): Promise<void> {
  const es = (user.preferred_language ?? 'en') === 'es';
  const isClient = user.role === 'client';
  const subject = es ? '👋 ¡Bienvenido a ProVendor!' : '👋 Welcome to ProVendor!';

  const html = wrap(subject, `
    <div class="badge">👋 ${es ? 'Bienvenido' : 'Welcome'}</div>
    <h1>${es ? `¡Hola${user.name ? `, ${user.name}` : ''}! Gracias por unirte.` : `Hi${user.name ? ` ${user.name}` : ''}! Thanks for joining.`}</h1>
    <p>${es
      ? 'Tu cuenta fue creada exitosamente. Aquí está lo que puedes hacer:'
      : 'Your account was created successfully. Here\'s what you can do next:'}</p>
    <hr/>
    ${isClient ? `
    <p>✅ <span class="hi">${es ? 'Publica trabajos' : 'Post jobs'}</span> — ${es
      ? 'Describe el servicio que necesitas y recibe ofertas de proveedores verificados.'
      : 'Describe the cleaning service you need and receive bids from verified providers.'}</p>
    <p>🔍 <span class="hi">${es ? 'Compara ofertas' : 'Compare bids'}</span> — ${es
      ? 'Revisa precios, perfiles y calificaciones antes de elegir.'
      : 'Review prices, profiles and ratings before making a choice.'}</p>
    <p>⭐ <span class="hi">${es ? 'Califica el servicio' : 'Rate the service'}</span> — ${es
      ? 'Tu opinión ayuda a mantener la calidad de la comunidad.'
      : 'Your feedback helps maintain quality across the community.'}</p>` : `
    <p>📋 <span class="hi">${es ? 'Completa tu perfil' : 'Complete your profile'}</span> — ${es
      ? 'Agrega tus áreas de servicio y sube tus documentos para ser aprobado.'
      : 'Add your service areas and upload your documents to get approved.'}</p>
    <p>⏳ <span class="hi">${es ? 'Espera la aprobación' : 'Wait for approval'}</span> — ${es
      ? 'El equipo de ProVendor revisará tus documentos. Te notificaremos por email.'
      : 'The ProVendor team will review your documents. We\'ll email you when approved.'}</p>
    <p>💼 <span class="hi">${es ? 'Recibe trabajos' : 'Receive jobs'}</span> — ${es
      ? 'Una vez aprobado, recibirás alertas de nuevos trabajos en tu área.'
      : 'Once approved, you\'ll get alerts for new jobs in your area.'}</p>`}
    <hr/>
    <div class="info-box"><p>${es ? '👆 Abre la app ProVendor para comenzar.' : '👆 Open the ProVendor app to get started.'}</p></div>
  `);

  await sendEmail(user.email, subject, html);
}

// ─── Handler: offer rejected → email losing provider ─────────────────────────

async function handleOfferRejected(application: any): Promise<void> {
  const [providerAuth, companyProfile, indProfile] = await Promise.all([
    supabase.auth.admin.getUserById(application.provider_id),
    supabase.from('companies').select('preferred_language').eq('user_id', application.provider_id).maybeSingle(),
    supabase.from('independents').select('preferred_language').eq('user_id', application.provider_id).maybeSingle(),
  ]);
  const providerEmail = providerAuth.data?.user?.email;
  if (!providerEmail) return;
  const es = ((companyProfile.data ?? indProfile.data)?.preferred_language ?? 'en') === 'es';

  const { data: job } = await supabase
    .from('job_requests')
    .select('city, service_type')
    .eq('id', application.job_request_id)
    .single();

  const subject = es ? 'Actualización sobre tu oferta en ProVendor' : 'Update on your ProVendor bid';
  const html = wrap(subject, `
    <div class="badge">ℹ️ ${es ? 'Oferta No Seleccionada' : 'Bid Not Selected'}</div>
    <h1>${es ? 'El cliente seleccionó otro proveedor' : 'The client selected another provider'}</h1>
    <p>${es
      ? `Gracias por tu interés. El cliente eligió otro proveedor para el trabajo${job?.city ? ` en <span class="teal">${job.city}</span>` : ''}.`
      : `Thank you for your interest. The client chose another provider for the job${job?.city ? ` in <span class="teal">${job.city}</span>` : ''}.`}</p>
    <hr/>
    <p>${es
      ? '¡No te desanimes! Hay nuevos trabajos disponibles cada día en tu área.'
      : "Don't be discouraged! New jobs are available every day in your area."}</p>
    <div class="info-box"><p>${es ? '👆 Sigue revisando las alertas de trabajo en la app.' : '👆 Keep checking job alerts in the app.'}</p></div>
  `);

  await sendEmail(providerEmail, subject, html);
}

// ─── Handler: job completed → email client (rate) + provider (congrats) ──────

async function handleJobCompleted(job: any): Promise<void> {
  const [clientAuth, clientProfile] = await Promise.all([
    supabase.auth.admin.getUserById(job.client_id),
    supabase.from('clients').select('preferred_language').eq('user_id', job.client_id).maybeSingle(),
  ]);
  const clientEmail = clientAuth.data?.user?.email;

  if (clientEmail) {
    const es = (clientProfile.data?.preferred_language ?? 'en') === 'es';
    const subject = es ? `✅ Trabajo completado en ${job.city}` : `✅ Job completed in ${job.city}`;
    const html = wrap(subject, `
      <div class="badge">✅ ${es ? 'Trabajo Completado' : 'Job Completed'}</div>
      <h1>${es ? '¡Tu servicio fue completado!' : 'Your service has been completed!'}</h1>
      <p>${es
        ? `El proveedor ha completado el trabajo de limpieza en <span class="teal">${job.city}</span>. Esperamos que estés satisfecho con el resultado.`
        : `The provider has completed the cleaning job in <span class="teal">${job.city}</span>. We hope you're satisfied with the result.`}</p>
      <hr/>
      <p>${es ? '⭐ <span class="hi">¿Cómo estuvo el servicio?</span> Tu calificación ayuda a otros clientes a elegir mejor.' : '⭐ <span class="hi">How was the service?</span> Your rating helps other clients make better choices.'}</p>
      <div class="info-box"><p>${es ? '👆 Abre la app para dejar tu calificación al proveedor.' : '👆 Open the app to leave your rating for the provider.'}</p></div>
    `);
    await sendEmail(clientEmail, subject, html);
  }

  const { data: acceptedApp } = await supabase
    .from('job_applications')
    .select('provider_id')
    .eq('job_request_id', job.id)
    .eq('status', 'accepted')
    .maybeSingle();

  if (acceptedApp) {
    const [provAuth, compProf, indProf] = await Promise.all([
      supabase.auth.admin.getUserById(acceptedApp.provider_id),
      supabase.from('companies').select('preferred_language').eq('user_id', acceptedApp.provider_id).maybeSingle(),
      supabase.from('independents').select('preferred_language').eq('user_id', acceptedApp.provider_id).maybeSingle(),
    ]);
    const provEmail = provAuth.data?.user?.email;
    if (provEmail) {
      const es = ((compProf.data ?? indProf.data)?.preferred_language ?? 'en') === 'es';
      const subject = es ? `🎉 ¡Trabajo completado! Buen trabajo en ${job.city}` : `🎉 Job completed! Great work in ${job.city}`;
      const html = wrap(subject, `
        <div class="badge">🎉 ${es ? '¡Completado!' : 'Completed!'}</div>
        <h1>${es ? '¡Excelente trabajo!' : 'Excellent work!'}</h1>
        <p>${es
          ? `El trabajo en <span class="teal">${job.city}</span> ha sido marcado como completado. El cliente recibirá una notificación para dejar su calificación.`
          : `The job in <span class="teal">${job.city}</span> has been marked as completed. The client will be prompted to leave their review.`}</p>
        <hr/>
        <p>${es ? 'Sigue así. Cada trabajo completado fortalece tu reputación en ProVendor.' : 'Keep it up. Every completed job strengthens your reputation on ProVendor.'}</p>
        <div class="info-box"><p>${es ? '👆 Consulta tu historial de trabajos y estadísticas en la app.' : '👆 Check your job history and statistics in the app.'}</p></div>
      `);
      await sendEmail(provEmail, subject, html);
    }
  }
}

// ─── Handler: job started → email client ─────────────────────────────────────

async function handleJobStarted(job: any): Promise<void> {
  const [clientAuth, clientProfile] = await Promise.all([
    supabase.auth.admin.getUserById(job.client_id),
    supabase.from('clients').select('preferred_language').eq('user_id', job.client_id).maybeSingle(),
  ]);
  const clientEmail = clientAuth.data?.user?.email;
  if (!clientEmail) return;
  const es = (clientProfile.data?.preferred_language ?? 'en') === 'es';

  // Get provider name from accepted application
  const { data: acceptedApp } = await supabase
    .from('job_applications')
    .select('provider_id, provider_type')
    .eq('job_request_id', job.id)
    .eq('status', 'accepted')
    .maybeSingle();

  let providerName = es ? 'El proveedor' : 'The provider';
  if (acceptedApp) {
    if (acceptedApp.provider_type === 'company') {
      const { data } = await supabase.from('companies').select('company_name').eq('user_id', acceptedApp.provider_id).single();
      providerName = data?.company_name ?? providerName;
    } else {
      const { data } = await supabase.from('independents').select('full_name').eq('user_id', acceptedApp.provider_id).single();
      providerName = data?.full_name ?? providerName;
    }
  }

  const subject = es
    ? `🚀 El proveedor inició tu trabajo en ${job.city}`
    : `🚀 Your provider started the job in ${job.city}`;

  const html = wrap(subject, `
    <div class="badge">🚀 ${es ? 'Trabajo Iniciado' : 'Job Started'}</div>
    <h1>${es ? '¡Tu servicio ha comenzado!' : 'Your service has started!'}</h1>
    <p>${es
      ? `<span class="hi">${providerName}</span> llegó al lugar y tomó la foto de inicio. El trabajo de limpieza en <span class="teal">${job.city}</span> está en progreso.`
      : `<span class="hi">${providerName}</span> arrived at the location and took the before photo. Your cleaning job in <span class="teal">${job.city}</span> is now in progress.`}</p>
    <hr/>
    <div class="row"><span class="lbl">${es ? 'Ciudad' : 'City'}</span><span class="val">${job.city}</span></div>
    <div class="row"><span class="lbl">${es ? 'Proveedor' : 'Provider'}</span><span class="val">${providerName}</span></div>
    ${job.started_at ? `<div class="row"><span class="lbl">${es ? 'Inicio' : 'Started at'}</span><span class="val">${new Date(job.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span></div>` : ''}
    <hr/>
    <div class="info-box"><p>${es ? '👆 Abre la app para seguir el progreso de tu trabajo.' : '👆 Open the app to follow the progress of your job.'}</p></div>
  `);

  await sendEmail(clientEmail, subject, html);
}

// ─── Handler: new support message ─────────────────────────────────────────────
// User → admin: only on first message (new support request)
// Admin → user: always notify

async function handleNewMessage(message: any): Promise<void> {
  const { data: chat } = await supabase
    .from('chats')
    .select('user_id, admin_id')
    .eq('id', message.chat_id)
    .single();
  if (!chat) return;

  const senderIsUser = message.sender_id === chat.user_id;

  if (senderIsUser) {
    // User opened a new support conversation — notify all admins (first message only, checked in trigger)
    const { data: adminRows } = await supabase.from('admins').select('id');
    if (!adminRows?.length) return;
    for (const admin of adminRows) {
      const { data: authAdmin } = await supabase.auth.admin.getUserById(admin.id);
      const adminEmail = authAdmin?.user?.email;
      if (!adminEmail) continue;

      // Get user display name
      const { data: clientRow } = await supabase.from('clients').select('full_name').eq('user_id', chat.user_id).maybeSingle();
      const userName = clientRow?.full_name ?? 'A user';

      const subject = `💬 New support message from ${userName} — ProVendor`;
      const preview = message.content.length > 120 ? message.content.slice(0, 120) + '…' : message.content;
      const html = wrap(subject, `
        <div class="badge">💬 Support Message</div>
        <h1>New message from ${userName}</h1>
        <p>A user started a new support conversation:</p>
        <hr/>
        <div class="info-box"><p>"${preview}"</p></div>
        <hr/>
        <p>Open the ProVendor admin panel to respond.</p>
      `);
      try { await sendEmail(adminEmail, subject, html); } catch (e) {
        console.error('[send-email] new_message admin notify', admin.user_id, e);
      }
    }
  } else {
    // Admin replied — notify the user
    const [userAuth, clientProfile] = await Promise.all([
      supabase.auth.admin.getUserById(chat.user_id),
      supabase.from('clients').select('preferred_language, full_name').eq('user_id', chat.user_id).maybeSingle(),
    ]);
    const userEmail = userAuth.data?.user?.email;
    if (!userEmail) return;
    const es = (clientProfile.data?.preferred_language ?? 'en') === 'es';
    const name = clientProfile.data?.full_name ?? '';

    const subject = es ? '💬 Tienes una respuesta de soporte — ProVendor' : '💬 You have a reply from ProVendor support';
    const preview = message.content.length > 120 ? message.content.slice(0, 120) + '…' : message.content;
    const html = wrap(subject, `
      <div class="badge">💬 ${es ? 'Mensaje de Soporte' : 'Support Message'}</div>
      <h1>${es ? `Hola${name ? ` ${name}` : ''}, el equipo de ProVendor te respondió` : `Hi${name ? ` ${name}` : ''}, ProVendor support replied`}</h1>
      <p>${es ? 'Recibiste una respuesta en tu chat de soporte:' : 'You received a reply in your support chat:'}</p>
      <hr/>
      <div class="info-box"><p>"${preview}"</p></div>
      <hr/>
      <div class="info-box"><p>${es ? '👆 Abre la app ProVendor para continuar la conversación.' : '👆 Open the ProVendor app to continue the conversation.'}</p></div>
    `);
    await sendEmail(userEmail, subject, html);
  }
}

// ─── Handler: work order created → email both parties ────────────────────────

async function handleWOCreated(data: any): Promise<void> {
  const { wo_number, job_request_id, client_id, provider_id } = data;
  if (!wo_number || !job_request_id || !client_id || !provider_id) {
    console.error('[send-email] wo_created: missing required fields', data);
    return;
  }

  const { data: job } = await supabase
    .from('job_requests')
    .select('city, service_type, scheduled_date, estimated_hours')
    .eq('id', job_request_id)
    .single();

  const isCom = job?.service_type === 'commercial';

  const [clientAuth, clientProfile, provAuth, compProf, indProf] = await Promise.all([
    supabase.auth.admin.getUserById(client_id),
    supabase.from('clients').select('preferred_language, full_name').eq('user_id', client_id).maybeSingle(),
    supabase.auth.admin.getUserById(provider_id),
    supabase.from('companies').select('preferred_language, company_name').eq('user_id', provider_id).maybeSingle(),
    supabase.from('independents').select('preferred_language, full_name').eq('user_id', provider_id).maybeSingle(),
  ]);

  const clientEmail = clientAuth.data?.user?.email;
  const providerEmail = provAuth.data?.user?.email;

  // Email client
  if (clientEmail) {
    const es = (clientProfile.data?.preferred_language ?? 'en') === 'es';
    const kind = isCom ? (es ? 'limpieza comercial' : 'commercial cleaning') : (es ? 'limpieza residencial' : 'residential cleaning');
    const subject = es
      ? `✍️ Firma requerida — Orden de Trabajo ${wo_number}`
      : `✍️ Signature Required — Work Order ${wo_number}`;
    const html = wrap(subject, `
      <div class="badge">✍️ ${es ? 'Firma Requerida' : 'Signature Required'}</div>
      <h1>${es ? `Se creó la Orden ${wo_number}` : `Work Order ${wo_number} Created`}</h1>
      <p>${es
        ? `Se generó una orden de trabajo para el servicio de <span class="teal">${kind}</span>. Necesitas firmarla digitalmente para confirmar el trabajo.`
        : `A work order was created for your <span class="teal">${kind}</span> service. You need to sign it digitally to confirm the job.`}</p>
      <hr/>
      <div class="row"><span class="lbl">${es ? 'Número de Orden' : 'WO Number'}</span><span class="val">${wo_number}</span></div>
      ${job ? `<div class="row"><span class="lbl">${es ? 'Ciudad' : 'City'}</span><span class="val">${job.city}</span></div>
      <div class="row"><span class="lbl">${es ? 'Fecha' : 'Date'}</span><span class="val">${job.scheduled_date}</span></div>` : ''}
      <hr/>
      <div class="info-box"><p>${es ? '👆 Abre la app ProVendor para revisar y firmar la Orden de Trabajo.' : '👆 Open the ProVendor app to review and sign the Work Order.'}</p></div>
    `);
    try { await sendEmail(clientEmail, subject, html); } catch (e) {
      console.error('[send-email] wo_created client', client_id, e);
    }
  }

  // Email provider
  if (providerEmail) {
    const provName = compProf.data?.company_name ?? indProf.data?.full_name ?? '';
    const es = ((compProf.data ?? indProf.data)?.preferred_language ?? 'en') === 'es';
    const kind = isCom ? (es ? 'limpieza comercial' : 'commercial cleaning') : (es ? 'limpieza residencial' : 'residential cleaning');
    const subject = es
      ? `✍️ Firma requerida — Orden de Trabajo ${wo_number}`
      : `✍️ Signature Required — Work Order ${wo_number}`;
    const html = wrap(subject, `
      <div class="badge">✍️ ${es ? 'Firma Requerida' : 'Signature Required'}</div>
      <h1>${es ? `Hola${provName ? ` ${provName}` : ''}, tienes una Orden de Trabajo` : `Hi${provName ? ` ${provName}` : ''}, you have a Work Order`}</h1>
      <p>${es
        ? `Se generó la Orden <span class="teal">${wo_number}</span> para el servicio de ${kind}. Necesitas firmarla para confirmar tu participación.`
        : `Work Order <span class="teal">${wo_number}</span> was generated for the ${kind} service. Sign it to confirm your participation.`}</p>
      <hr/>
      <div class="row"><span class="lbl">${es ? 'Número de Orden' : 'WO Number'}</span><span class="val">${wo_number}</span></div>
      ${job ? `<div class="row"><span class="lbl">${es ? 'Ciudad' : 'City'}</span><span class="val">${job.city}</span></div>
      <div class="row"><span class="lbl">${es ? 'Fecha' : 'Date'}</span><span class="val">${job.scheduled_date}</span></div>` : ''}
      <hr/>
      <div class="info-box"><p>${es ? '👆 Abre la app ProVendor para revisar y firmar la Orden de Trabajo.' : '👆 Open the ProVendor app to review and sign the Work Order.'}</p></div>
    `);
    try { await sendEmail(providerEmail, subject, html); } catch (e) {
      console.error('[send-email] wo_created provider', provider_id, e);
    }
  }
}

// ─── Handler: client signed WO → email provider ──────────────────────────────

async function handleWOClientSigned(data: any): Promise<void> {
  const { wo_number, provider_id } = data;
  if (!wo_number || !provider_id) {
    console.error('[send-email] wo_client_signed: missing required fields', data);
    return;
  }

  const [provAuth, compProf, indProf] = await Promise.all([
    supabase.auth.admin.getUserById(provider_id),
    supabase.from('companies').select('preferred_language, company_name').eq('user_id', provider_id).maybeSingle(),
    supabase.from('independents').select('preferred_language, full_name').eq('user_id', provider_id).maybeSingle(),
  ]);

  const providerEmail = provAuth.data?.user?.email;
  if (!providerEmail) return;

  const es = ((compProf.data ?? indProf.data)?.preferred_language ?? 'en') === 'es';
  const provName = compProf.data?.company_name ?? indProf.data?.full_name ?? '';
  const subject = es
    ? `✍️ El cliente firmó — Orden ${wo_number}, tu turno`
    : `✍️ Client signed — Work Order ${wo_number}, your turn`;

  const html = wrap(subject, `
    <div class="badge">✍️ ${es ? 'Acción Requerida' : 'Action Required'}</div>
    <h1>${es ? `Hola${provName ? ` ${provName}` : ''}, el cliente ya firmó` : `Hi${provName ? ` ${provName}` : ''}, the client has signed`}</h1>
    <p>${es
      ? `El cliente firmó la Orden de Trabajo <span class="teal">${wo_number}</span>. Ahora solo falta tu firma para confirmar el trabajo.`
      : `The client signed Work Order <span class="teal">${wo_number}</span>. Only your signature is needed to confirm the job.`}</p>
    <hr/>
    <div class="info-box"><p>${es ? '👆 Abre la app ProVendor para revisar la Orden y añadir tu firma.' : '👆 Open the ProVendor app to review the Work Order and add your signature.'}</p></div>
  `);

  await sendEmail(providerEmail, subject, html);
}

// ─── Handler: provider signed WO → email client ──────────────────────────────

async function handleWOProviderSigned(data: any): Promise<void> {
  const { wo_number, client_id } = data;
  if (!wo_number || !client_id) {
    console.error('[send-email] wo_provider_signed: missing required fields', data);
    return;
  }

  const [clientAuth, clientProfile] = await Promise.all([
    supabase.auth.admin.getUserById(client_id),
    supabase.from('clients').select('preferred_language, full_name').eq('user_id', client_id).maybeSingle(),
  ]);

  const clientEmail = clientAuth.data?.user?.email;
  if (!clientEmail) return;

  const es = (clientProfile.data?.preferred_language ?? 'en') === 'es';
  const name = clientProfile.data?.full_name ?? '';
  const subject = es
    ? `✍️ El proveedor firmó — Orden ${wo_number}`
    : `✍️ Provider signed — Work Order ${wo_number}`;

  const html = wrap(subject, `
    <div class="badge">✍️ ${es ? 'Acción Completada' : 'Action Completed'}</div>
    <h1>${es ? `Hola${name ? ` ${name}` : ''}, el proveedor firmó` : `Hi${name ? ` ${name}` : ''}, the provider has signed`}</h1>
    <p>${es
      ? `El proveedor firmó la Orden de Trabajo <span class="teal">${wo_number}</span>. El trabajo comenzará según la fecha acordada.`
      : `The provider signed Work Order <span class="teal">${wo_number}</span>. The job will begin on the scheduled date.`}</p>
    <hr/>
    <div class="info-box"><p>${es ? '👆 Abre la app ProVendor para ver el estado del trabajo.' : '👆 Open the ProVendor app to track the job status.'}</p></div>
  `);

  await sendEmail(clientEmail, subject, html);
}

// ─── Handler: both signed WO → confirmation email to both ────────────────────

async function handleWOBothSigned(data: any): Promise<void> {
  const { wo_number, client_id, provider_id } = data;
  if (!wo_number || !client_id || !provider_id) {
    console.error('[send-email] wo_both_signed: missing required fields', data);
    return;
  }

  const [clientAuth, clientProfile, provAuth, compProf, indProf] = await Promise.all([
    supabase.auth.admin.getUserById(client_id),
    supabase.from('clients').select('preferred_language, full_name').eq('user_id', client_id).maybeSingle(),
    supabase.auth.admin.getUserById(provider_id),
    supabase.from('companies').select('preferred_language, company_name').eq('user_id', provider_id).maybeSingle(),
    supabase.from('independents').select('preferred_language, full_name').eq('user_id', provider_id).maybeSingle(),
  ]);

  const clientEmail = clientAuth.data?.user?.email;
  const providerEmail = provAuth.data?.user?.email;

  if (clientEmail) {
    const es = (clientProfile.data?.preferred_language ?? 'en') === 'es';
    const subject = es
      ? `🎉 Trabajo Confirmado — Orden ${wo_number}`
      : `🎉 Job Confirmed — Work Order ${wo_number}`;
    const html = wrap(subject, `
      <div class="badge">🎉 ${es ? 'Trabajo Confirmado' : 'Job Confirmed'}</div>
      <h1>${es ? '¡Ambas partes firmaron!' : 'Both parties signed!'}</h1>
      <p>${es
        ? `La Orden <span class="teal">${wo_number}</span> fue firmada por ambas partes. El trabajo está oficialmente confirmado y comenzará en la fecha acordada.`
        : `Work Order <span class="teal">${wo_number}</span> has been signed by both parties. The job is officially confirmed and will begin on the scheduled date.`}</p>
      <hr/>
      <div class="info-box"><p>${es ? '👆 Puedes seguir el progreso de tu trabajo en la app ProVendor.' : '👆 You can track the progress of your job in the ProVendor app.'}</p></div>
    `);
    try { await sendEmail(clientEmail, subject, html); } catch (e) {
      console.error('[send-email] wo_both_signed client', client_id, e);
    }
  }

  if (providerEmail) {
    const es = ((compProf.data ?? indProf.data)?.preferred_language ?? 'en') === 'es';
    const provName = compProf.data?.company_name ?? indProf.data?.full_name ?? '';
    const subject = es
      ? `🎉 Trabajo Confirmado — Orden ${wo_number}`
      : `🎉 Job Confirmed — Work Order ${wo_number}`;
    const html = wrap(subject, `
      <div class="badge">🎉 ${es ? 'Trabajo Confirmado' : 'Job Confirmed'}</div>
      <h1>${es ? `¡Excelente${provName ? ` ${provName}` : ''}! El trabajo está confirmado` : `Great${provName ? ` ${provName}` : ''}! The job is confirmed`}</h1>
      <p>${es
        ? `La Orden <span class="teal">${wo_number}</span> fue firmada por ambas partes. Prepárate para comenzar el trabajo en la fecha acordada.`
        : `Work Order <span class="teal">${wo_number}</span> has been signed by both parties. Get ready to start on the scheduled date.`}</p>
      <hr/>
      <div class="info-box"><p>${es ? '👆 Revisa los detalles del trabajo en tu app ProVendor.' : '👆 Review the job details in your ProVendor app.'}</p></div>
    `);
    try { await sendEmail(providerEmail, subject, html); } catch (e) {
      console.error('[send-email] wo_both_signed provider', provider_id, e);
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

  // Require a Bearer token — blocks unauthenticated external callers.
  // Valid callers: Supabase DB triggers (service role key) or app clients (user JWT).
  const authHeader = req.headers.get('authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { type, data } = await req.json();

    switch (type) {
      case 'new_job':          return new Response(JSON.stringify(await handleNewJob(data)),             { status: 200 });
      case 'new_offer':        await handleNewOffer(data);        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      case 'offer_accepted':   await handleOfferAccepted(data);   return new Response(JSON.stringify({ ok: true }), { status: 200 });
      case 'offer_rejected':   await handleOfferRejected(data);   return new Response(JSON.stringify({ ok: true }), { status: 200 });
      case 'provider_approved':await handleProviderStatus(data, 'approved'); return new Response(JSON.stringify({ ok: true }), { status: 200 });
      case 'provider_rejected':await handleProviderStatus(data, 'rejected'); return new Response(JSON.stringify({ ok: true }), { status: 200 });
      case 'welcome':          await handleWelcome(data);          return new Response(JSON.stringify({ ok: true }), { status: 200 });
      case 'job_completed':    await handleJobCompleted(data);     return new Response(JSON.stringify({ ok: true }), { status: 200 });
      case 'job_started':      await handleJobStarted(data);       return new Response(JSON.stringify({ ok: true }), { status: 200 });
      case 'new_message':      await handleNewMessage(data);       return new Response(JSON.stringify({ ok: true }), { status: 200 });
      case 'wo_created':         await handleWOCreated(data);          return new Response(JSON.stringify({ ok: true }), { status: 200 });
      case 'wo_client_signed':   await handleWOClientSigned(data);     return new Response(JSON.stringify({ ok: true }), { status: 200 });
      case 'wo_provider_signed': await handleWOProviderSigned(data);   return new Response(JSON.stringify({ ok: true }), { status: 200 });
      case 'wo_both_signed':     await handleWOBothSigned(data);       return new Response(JSON.stringify({ ok: true }), { status: 200 });
      default:
        return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), { status: 400 });
    }
  } catch (err) {
    console.error('[send-email]', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
