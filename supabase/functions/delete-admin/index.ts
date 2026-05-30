// Edge Function: delete-admin
// Removes an admin (admins row + Supabase Auth account) via the service role.
// Only callable by an authenticated super admin. A super admin cannot delete
// themselves or another super admin.

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
    const { admin_id } = body as { admin_id?: string };

    if (!admin_id?.trim()) {
      return new Response(JSON.stringify({ error: 'admin_id is required' }), { status: 400, headers: corsHeaders });
    }

    if (admin_id === caller.id) {
      return new Response(JSON.stringify({ error: 'You cannot delete your own account' }), { status: 400, headers: corsHeaders });
    }

    // ── 3. Look up the target; block deleting another super admin ────────────
    const { data: target } = await supabaseAdmin
      .from('admins')
      .select('id, is_super_admin')
      .eq('id', admin_id)
      .maybeSingle();

    if (!target) {
      return new Response(JSON.stringify({ error: 'Admin not found' }), { status: 404, headers: corsHeaders });
    }

    if (target.is_super_admin) {
      return new Response(JSON.stringify({ error: 'Cannot delete a super admin' }), { status: 403, headers: corsHeaders });
    }

    // ── 4. Delete the admins row, then the auth account ──────────────────────
    const { error: delErr } = await supabaseAdmin.from('admins').delete().eq('id', admin_id);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), { status: 500, headers: corsHeaders });
    }

    // Remove the underlying Supabase Auth account so they lose all access.
    await supabaseAdmin.auth.admin.deleteUser(admin_id).catch((e) => {
      console.warn('[delete-admin] auth user delete failed (row already removed):', e);
    });

    console.log(`[delete-admin] Admin ${admin_id} removed by super-admin ${caller.id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err: any) {
    console.error('[delete-admin] Unexpected error:', err);
    return new Response(JSON.stringify({ error: err?.message ?? 'Internal server error' }), { status: 500, headers: corsHeaders });
  }
});
