import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { AdminAction, PlatformStats, Provider } from '../types.ts';

export const supabase: SupabaseClient = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
);

const EMPTY_PLATFORM_STATS: PlatformStats = {
  totalUsers: 0,
  totalProviders: 0,
  pendingProviders: 0,
  approvedProviders: 0,
  totalEvents: 0,
  usersActiveThisMonth: 0,
  eventsActive: 0,
  usersWithEvents: 0,
};

function num(value: unknown): number {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

function mapPlatformStats(raw: Record<string, unknown>): PlatformStats {
  return {
    totalUsers: num(raw.totalUsers),
    totalProviders: num(raw.totalProviders),
    pendingProviders: num(raw.pendingProviders),
    approvedProviders: num(raw.approvedProviders),
    totalEvents: num(raw.totalEvents),
    usersActiveThisMonth: num(raw.usersActiveThisMonth),
    eventsActive: num(raw.eventsActive),
    usersWithEvents: num(raw.usersWithEvents),
  };
}

/** Prestataires en attente de validation */
export async function fetchPendingProviders(): Promise<Provider[]> {
  const { data, error } = await supabase
    .from('provider_profiles')
    .select('*, provider_documents(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data as Provider[];
}

/** Tous les prestataires */
export async function fetchAllProviders(): Promise<Provider[]> {
  const { data, error } = await supabase
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
  const { error } = await supabase
    .from('provider_profiles')
    .update({ status, admin_note: adminNote ?? null })
    .eq('id', providerId);
  return !error;
}

export async function fetchAdminActions(limit = 50): Promise<AdminAction[]> {
  const { data, error } = await supabase
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

function countOrZero(
  label: string,
  result: { count: number | null; error: { message: string } | null }
): number {
  if (result.error) {
    console.error(`[fetchPlatformStats] ${label}:`, result.error.message);
    return 0;
  }
  return result.count ?? 0;
}

/** Fallback si la RPC admin n’est pas encore déployée. */
async function fetchPlatformStatsFallback(): Promise<PlatformStats> {
  const [users, providers, pending, approved, events, creators] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('provider_profiles').select('id', { count: 'exact', head: true }),
    supabase.from('provider_profiles').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('provider_profiles').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('events').select('id', { count: 'exact', head: true }),
    supabase.from('events').select('creator_id'),
  ]);

  const creatorIds = new Set(
    (creators.data ?? []).map((r: { creator_id: string }) => r.creator_id).filter(Boolean)
  );

  return {
    ...EMPTY_PLATFORM_STATS,
    totalUsers: countOrZero('profiles', users),
    totalProviders: countOrZero('provider_profiles', providers),
    pendingProviders: countOrZero('provider_profiles pending', pending),
    approvedProviders: countOrZero('provider_profiles approved', approved),
    totalEvents: countOrZero('events', events),
    usersWithEvents: creatorIds.size,
  };
}

/** Stats agrégées (RPC admin — nécessite migration 20260513_admin_platform_stats_rpc). */
export async function fetchPlatformStats(): Promise<PlatformStats> {
  const { data, error } = await supabase.rpc('get_admin_platform_stats');

  if (error) {
    console.warn('[fetchPlatformStats] RPC:', error.message, '— fallback client');
    return fetchPlatformStatsFallback();
  }

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return mapPlatformStats(data as Record<string, unknown>);
  }

  return fetchPlatformStatsFallback();
}
