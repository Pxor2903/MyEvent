import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AdminAction, PlatformStats, Provider } from '../types.ts';

const url = import.meta.env.VITE_SUPABASE_URL ?? '';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export function getSupabaseAdmin(): SupabaseClient {
  return createClient(url, key);
}

/** Prestataires en attente de validation */
export async function fetchPendingProviders(): Promise<Provider[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('provider_profiles')
    .select('*, provider_documents(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data as Provider[];
}

/** Tous les prestataires */
export async function fetchAllProviders(): Promise<Provider[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('provider_profiles')
    .select('*, provider_documents(*)')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data as Provider[];
}

export async function updateProviderStatus(
  providerId: string,
  status: Provider['status'],
  adminNote?: string
): Promise<boolean> {
  const sb = getSupabaseAdmin();
  const { error } = await sb
    .from('provider_profiles')
    .update({ status, admin_note: adminNote ?? null })
    .eq('id', providerId);
  return !error;
}

export async function fetchAdminActions(limit = 50): Promise<AdminAction[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('admin_actions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    admin_name: row.admin_name as string,
    action_type: row.action_type as string,
    target_name: row.target_name as string,
    note: row.note as string | undefined,
    created_at: row.created_at as string,
  }));
}

/** Stats agrégées (requêtes simples) */
export async function fetchPlatformStats(): Promise<PlatformStats> {
  const sb = getSupabaseAdmin();
  const [users, providers, pending, approved, events] = await Promise.all([
    sb.from('profiles').select('id', { count: 'exact', head: true }),
    sb.from('provider_profiles').select('id', { count: 'exact', head: true }),
    sb.from('provider_profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    sb.from('provider_profiles').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    sb.from('events').select('id', { count: 'exact', head: true }),
  ]);
  return {
    totalUsers: users.count ?? 0,
    totalProviders: providers.count ?? 0,
    pendingProviders: pending.count ?? 0,
    approvedProviders: approved.count ?? 0,
    totalEvents: events.count ?? 0,
  };
}
