/**
 * userUtils.ts — Cross-table user lookup helpers
 *
 * The DB has no central `users` table. Identity lives in:
 *   clients(user_id = auth.uid(), ...)
 *   companies(user_id = auth.uid(), ...)   — NO status column
 *   independents(user_id = auth.uid(), ...) — NO status column
 *   admins(id = auth.uid(), ...)
 *
 * Lookup priority: admins → companies → independents → clients
 * Admins are checked FIRST so an account in both tables gets the admin role.
 *
 * companies/independents have no status column — approval lives in documents.
 */
import { supabase } from '@/lib/supabase';
import type { UserRole } from '@/types';

export interface UnifiedUser {
  id: string;               // auth.uid()
  email: string;
  role: UserRole;
  status: string;
  country: string;
  preferred_language: string;
  push_token?: string | null;
  name?: string;
  available?: boolean;
  created_at?: string;
}

// Ordered by priority: companies → independents → clients
// (admins checked separately and first in getUserProfile)
// NOTE: companies/independents intentionally omit 'status' — column does not exist.
const PROFILE_TABLES = [
  {
    table: 'companies',
    role: 'company' as UserRole,
    nameField: 'company_name',
    select: 'user_id, company_name, email, country, preferred_language, push_token, available, status, created_at',
    defaultStatus: 'pending',
  },
  {
    table: 'independents',
    role: 'independent' as UserRole,
    nameField: 'full_name',
    select: 'user_id, full_name, email, country, preferred_language, push_token, available, status, created_at',
    defaultStatus: 'pending',
  },
  {
    table: 'clients',
    role: 'client' as UserRole,
    nameField: 'full_name',
    select: 'user_id, full_name, email, country, status, preferred_language, push_token, created_at',
    defaultStatus: 'approved',
  },
] as const;

/** Find a single user across all profile tables.
 *  Priority: admins first → companies → independents → clients.
 *  This ensures an admin is never mistakenly identified as another role.
 */
export async function getUserProfile(userId: string): Promise<UnifiedUser | null> {
  // ── 1. Check admins FIRST ────────────────────────────────────────────────
  const { data: admin, error: adminError } = await supabase
    .from('admins')
    .select('id, email, created_at')
    .eq('id', userId)
    .maybeSingle();
  console.log('[getUserProfile] userId:', userId, '| admin:', admin, '| adminError:', adminError);
  if (adminError) console.warn('[getUserProfile] admins query error:', adminError.message);
  if (admin) {
    return {
      id: userId,
      email: admin.email ?? '',
      role: 'admin',
      status: 'approved',
      country: 'usa',
      preferred_language: 'en',
      push_token: null,
      created_at: admin.created_at,
    };
  }

  // ── 2. Then check companies → independents → clients ────────────────────
  for (const { table, role, nameField, select, defaultStatus } of PROFILE_TABLES) {
    const { data, error } = await (supabase as any)
      .from(table)
      .select(select)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.warn(`[getUserProfile] ${table} query error:`, error.message);
      continue;
    }
    if (data) {
      return {
        id: userId,
        email: data.email ?? '',
        role,
        // clients have a status column; companies/independents default to 'pending'
        status: data.status ?? defaultStatus,
        country: data.country ?? 'usa',
        preferred_language: data.preferred_language ?? 'en',
        push_token: data.push_token ?? null,
        name: data[nameField] ?? '',
        available: data.available ?? false,
        created_at: data.created_at,
      };
    }
  }

  return null;
}

/** Get push token + language preference for a single user. */
export async function getUserPushToken(userId: string): Promise<{ token: string | null; es: boolean }> {
  for (const { table } of PROFILE_TABLES) {
    const { data } = await (supabase as any)
      .from(table)
      .select('push_token, preferred_language')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) {
      return { token: data.push_token ?? null, es: data.preferred_language === 'es' };
    }
  }
  return { token: null, es: false };
}

/** Batch-get push tokens for multiple user IDs. */
export async function getUserPushTokens(
  userIds: string[],
): Promise<Record<string, { token: string | null; es: boolean }>> {
  if (userIds.length === 0) return {};

  const [clientsRes, companiesRes, independentsRes] = await Promise.all([
    supabase.from('clients').select('user_id, push_token, preferred_language').in('user_id', userIds),
    supabase.from('companies').select('user_id, push_token, preferred_language').in('user_id', userIds),
    supabase.from('independents').select('user_id, push_token, preferred_language').in('user_id', userIds),
  ]);

  const result: Record<string, { token: string | null; es: boolean }> = {};
  const allRows = [
    ...(clientsRes.data ?? []),
    ...(companiesRes.data ?? []),
    ...(independentsRes.data ?? []),
  ];
  for (const row of allRows) {
    if (!result[row.user_id]) {
      result[row.user_id] = { token: row.push_token ?? null, es: row.preferred_language === 'es' };
    }
  }
  return result;
}

/** Get all registered users for admin panels (name, role, status).
 *  NOTE: companies/independents have no status column — omitted from SELECT.
 */
export async function getAllUsers(): Promise<UnifiedUser[]> {
  const [clientsRes, companiesRes, independentsRes] = await Promise.all([
    supabase.from('clients').select('user_id, full_name, country, status, preferred_language, push_token, created_at').order('created_at', { ascending: false }),
    supabase.from('companies').select('user_id, company_name, country, preferred_language, push_token, status, created_at').order('created_at', { ascending: false }),
    supabase.from('independents').select('user_id, full_name, country, preferred_language, push_token, status, created_at').order('created_at', { ascending: false }),
  ]);

  const users: UnifiedUser[] = [
    ...(clientsRes.data ?? []).map((r: any) => ({ id: r.user_id, email: '', role: 'client' as UserRole, status: r.status ?? 'approved', country: r.country ?? 'usa', preferred_language: r.preferred_language ?? 'en', push_token: r.push_token, name: r.full_name, created_at: r.created_at })),
    ...(companiesRes.data ?? []).map((r: any) => ({ id: r.user_id, email: '', role: 'company' as UserRole, status: r.status ?? 'pending', country: r.country ?? 'usa', preferred_language: r.preferred_language ?? 'en', push_token: r.push_token, name: r.company_name, created_at: r.created_at })),
    ...(independentsRes.data ?? []).map((r: any) => ({ id: r.user_id, email: '', role: 'independent' as UserRole, status: r.status ?? 'pending', country: r.country ?? 'usa', preferred_language: r.preferred_language ?? 'en', push_token: r.push_token, name: r.full_name, created_at: r.created_at })),
  ];

  users.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
  return users;
}

/** Update push token for the current user across the right profile table. */
export async function savePushToken(userId: string, token: string): Promise<void> {
  for (const { table } of PROFILE_TABLES) {
    const { data } = await (supabase as any)
      .from(table)
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) {
      await (supabase as any).from(table).update({ push_token: token }).eq('user_id', userId);
      return;
    }
  }
}

/** Update lat/lon for the current user across the right profile table. */
export async function saveUserLocation(
  userId: string,
  latitude: number,
  longitude: number,
): Promise<void> {
  for (const { table } of PROFILE_TABLES) {
    const { data } = await (supabase as any)
      .from(table)
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) {
      await (supabase as any).from(table).update({ latitude, longitude }).eq('user_id', userId);
      return;
    }
  }
}

/** Update status for a provider or client (admin action).
 *  Writes to the correct profile table (companies/independents/clients) and documents table.
 */
export async function updateProviderStatus(
  userId: string,
  status: 'approved' | 'rejected' | 'pending' | 'suspended',
): Promise<{ error: string | null }> {
  // Determine which profile table this user belongs to
  const { data: comp } = await supabase.from('companies').select('user_id').eq('user_id', userId).maybeSingle();
  const { data: client } = comp
    ? { data: null }
    : await supabase.from('clients').select('user_id').eq('user_id', userId).maybeSingle();
  const profileTable = comp ? 'companies' : client ? 'clients' : 'independents';

  const [profileRes, docsRes] = await Promise.all([
    (supabase as any).from(profileTable).update({ status }).eq('user_id', userId),
    supabase.from('documents').update({ status }).eq('user_id', userId),
  ]);

  const err = profileRes.error ?? docsRes.error;
  return { error: err?.message ?? null };
}
