// Shared caller-authentication helpers for edge functions.
// Deploy with --no-verify-jwt is NOT required: these checks run in-function.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

export function bearerToken(req: Request): string {
  const h = req.headers.get('authorization') ?? '';
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : '';
}

// Constant-time string comparison.
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** True when the caller presented the project's service-role key (cron, DB triggers). */
export function isServiceCaller(req: Request): boolean {
  return safeEqual(bearerToken(req), SERVICE_KEY);
}

/** True when the caller is service-role OR holds a valid signed-in user JWT. */
export async function isServiceOrUser(req: Request): Promise<boolean> {
  if (isServiceCaller(req)) return true;
  const token = bearerToken(req);
  if (!token) return false;
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, SERVICE_KEY);
  const { data, error } = await admin.auth.getUser(token);
  return !error && !!data?.user;
}

export function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
