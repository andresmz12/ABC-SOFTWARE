// Edge Function: delete-account
// Lets a signed-in user delete their OWN account (required by App Store 5.1.1(v)
// and Google Play). Caller identity comes from the JWT — no user id is accepted
// from the request body.
//
// Strategy:
//   1. Try a hard delete of the auth user (cascades to users and owned rows).
//   2. If business records (jobs, invoices, payments, work orders) block it via
//      foreign keys, fall back to anonymisation: scrub personal data, free the
//      email, and permanently ban the login. Records needed for accounting and
//      dispute history stay, but no longer identify the person.
// Admins cannot self-delete (use delete-admin).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const token = (req.headers.get('Authorization') ?? '').replace(/^bearer\s+/i, '').trim();
  if (!token) return json({ error: 'Unauthorized' }, 401);
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return json({ error: 'Unauthorized' }, 401);

  const uid = user.id;

  const { data: isAdmin } = await admin.from('admins').select('id').eq('id', uid).maybeSingle();
  if (isAdmin) return json({ error: 'Admin accounts cannot be deleted here' }, 403);

  // Do not allow deletion while work is in flight — it would strand the other party.
  const { count: openJobs } = await admin
    .from('job_requests')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', uid)
    .in('status', ['accepted', 'in_progress']);
  const { count: openApps } = await admin
    .from('job_applications')
    .select('id', { count: 'exact', head: true })
    .eq('provider_id', uid)
    .eq('status', 'accepted');
  if ((openJobs ?? 0) > 0 || (openApps ?? 0) > 0) {
    // accepted apps on finished jobs are fine; check the jobs themselves
    const { data: active } = await admin
      .from('job_applications')
      .select('job_requests!inner(status)')
      .eq('provider_id', uid)
      .eq('status', 'accepted')
      .in('job_requests.status', ['accepted', 'in_progress']);
    if ((openJobs ?? 0) > 0 || (active?.length ?? 0) > 0) {
      return json({ error: 'active_jobs', message: 'Finish or cancel your active jobs before deleting your account.' }, 409);
    }
  }

  // 1) Hard delete
  const del = await admin.auth.admin.deleteUser(uid);
  if (!del.error) return json({ ok: true, mode: 'deleted' });

  // 2) Anonymise
  console.warn('[delete-account] hard delete blocked, anonymising:', del.error.message);
  const tag = uid.replace(/-/g, '').slice(0, 12);
  const scrub = { full_name: 'Deleted user', phone: '', address: '' };

  await admin.from('clients').update(scrub).eq('user_id', uid);
  await admin.from('independents').update(scrub).eq('user_id', uid);
  await admin.from('companies').update({ company_name: 'Deleted company', phone: '', address: '' }).eq('user_id', uid);
  await admin.from('users').update({
    email: `deleted-${tag}@deleted.invalid`,
    status: 'suspended',
    push_token: null,
  }).eq('id', uid);

  const upd = await admin.auth.admin.updateUserById(uid, {
    email: `deleted-${tag}@deleted.invalid`,
    ban_duration: '876000h',
    user_metadata: {},
  });
  if (upd.error) return json({ error: upd.error.message }, 500);

  return json({ ok: true, mode: 'anonymised' });
});
