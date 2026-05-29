// Edge Function: create-admin
// Creates a new admin user via the Supabase Auth Admin API (service role).
// Only callable by an authenticated super admin.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // ── 1. Verify caller is an authenticated super admin ─────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    const callerToken = authHeader.replace('Bearer ', '').trim();
    if (!callerToken) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: corsHeaders });
    }

    const { data: { user: caller }, error: authErr } = await supabaseAdmin.auth.getUser(callerToken);
    if (authErr || !caller) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: corsHeaders });
    }

    const { data: callerAdmin } = await supabaseAdmin
      .from('admins')
      .select('is_super_admin')
      .eq('id', caller.id)
      .maybeSingle();

    if (!callerAdmin?.is_super_admin) {
      return new Response(JSON.stringify({ error: 'Super admin access required' }), { status: 403, headers: corsHeaders });
    }

    // ── 2. Validate request body ─────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const { email, password, display_name } = body as { email?: string; password?: string; display_name?: string };

    if (!email?.trim() || !password?.trim() || !display_name?.trim()) {
      return new Response(JSON.stringify({ error: 'email, password, and display_name are required' }), { status: 400, headers: corsHeaders });
    }

    if (password.trim().length < 8) {
      return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), { status: 400, headers: corsHeaders });
    }

    // Check email not already in admins table
    const { data: existing } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: 'An admin with this email already exists' }), { status: 409, headers: corsHeaders });
    }

    // ── 3. Create the Supabase Auth user ────────────────────────────────────
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password: password.trim(),
      email_confirm: true,   // skip email verification — internal tool
    });

    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message ?? 'Failed to create auth user' }), { status: 400, headers: corsHeaders });
    }

    // ── 4. Insert into admins table ──────────────────────────────────────────
    const { error: insertErr } = await supabaseAdmin.from('admins').insert({
      id:            created.user.id,
      email:         email.trim().toLowerCase(),
      display_name:  display_name.trim(),
      is_super_admin: false,
      invited_by:    caller.id,
    });

    if (insertErr) {
      // Roll back: remove the auth user so we don't leave orphans
      await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {});
      return new Response(JSON.stringify({ error: insertErr.message }), { status: 500, headers: corsHeaders });
    }

    console.log(`[create-admin] Created admin ${email} (id: ${created.user.id}) by super-admin ${caller.id}`);

    return new Response(
      JSON.stringify({ success: true, id: created.user.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('[create-admin] Unexpected error:', err);
    return new Response(JSON.stringify({ error: err?.message ?? 'Internal server error' }), { status: 500, headers: corsHeaders });
  }
});
