/**
 * userUtils.ts — Cross-table user lookup helpers
 *
 * The DB has no central `users` table. Identity lives in:
 *   clients(user_id = auth.uid(), ...)
 *   companies(user_id = auth.uid(), ...)
 *   independents(user_id = auth.uid(), ...)
 *   admins(id = auth.uid(), ...)
 *
 * All helpers try each table in order and return on first match.
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

const PROFILE_TABLES = [
  {
    table: 'clients',
    role: 'client' as UserRole,
    nameField: 'full_name',
    select: 'user_id, full_name, country, status, preferred_language, push_token, available, created_at',
  },
  {
    table: 'companies',
    role: 'company' as UserRole,
    nameField: 'company_name',
    select: 'user_id, company_name, country, status, preferred_language, push_token, available, created_at',
  },
  {
    table: 'independents',
    role: 'independent' as UserRole,
    nameField: 'full_name',
    select: 'user_id, full_name, country, status, preferred_language, push_token, available, created_at',
  },
] as const;

/** Find a single user across all profile tables. */
export async function getUserProfile(userId: string): Promise<UnifiedUser | null> {
  for (const { table, role, nameField, select } of PROFILE_TABLES) {
    const { data } = await (supabase as any)
      .from(table)
      .select(select)
      .eq('user_id', userId)
      .maybeSingle();
    if (data) {
      return {
        id: userId,
        email: '',
        role,
        status: data.status ?? (role === 'client' ? 'approved' : 'pending'),
        country: data.country ?? 'usa',
        preferred_language: data.preferred_language ?? 'en',
        push_token: data.push_token ?? null,
        name: data[nameField] ?? '',
        available: data.available ?? false,
        created_at: data.created_at,
      };
    }
  }

  // Check admins table
  const { data: admin } = await supabase
    .from('admins')
    .select('id, email, created_at')
    .eq('id', userId)
    .maybeSingle();
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

/** Get all registered users for admin panels (name, role, status). */
export async function getAllUsers(): Promise<UnifiedUser[]> {
  const [clientsRes, companiesRes, independentsRes] = await Promise.all([
    supabase.from('clients').select('user_id, full_name, country, status, preferred_language, push_token, created_at').order('created_at', { ascending: false }),
    supabase.from('companies').select('user_id, company_name, country, status, preferred_language, push_token, created_at').order('created_at', { ascending: false }),
    supabase.from('independents').select('user_id, full_name, country, status, preferred_language, push_token, created_at').order('created_at', { ascending: false }),
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

/** Update status for a provider (admin action).
 *  Approval status lives in the `documents` table — companies/independents
 *  do NOT have a status column.
 */
export async function updateProviderStatus(
  userId: string,
  status: 'approved' | 'rejected' | 'pending' | 'suspended',
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('documents')
    .update({ status })
    .eq('user_id', userId);
  return { error: error?.message ?? null };
}
