import type { User } from '@/core/types';
import { supabase } from './client';

const TABLE = 'profiles';

type DbProfile = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  street: string | null;
  city: string | null;
  zip_code: string | null;
  avatar_url: string | null;
  created_at: string;
};

function fromDb(row: DbProfile): User {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone ?? undefined,
    street: row.street ?? undefined,
    city: row.city ?? undefined,
    zipCode: row.zip_code ?? undefined,
    createdAt: row.created_at,
    avatar: row.avatar_url ?? undefined
  };
}

function toDb(profile: User): DbProfile {
  return {
    id: profile.id,
    email: profile.email,
    first_name: profile.firstName,
    last_name: profile.lastName,
    phone: profile.phone ?? null,
    street: profile.street ?? null,
    city: profile.city ?? null,
    zip_code: profile.zipCode ?? null,
    avatar_url: profile.avatar ?? null,
    created_at: profile.createdAt
  };
}

export const profilesApi = {
  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return fromDb(data as DbProfile);
  },

  async upsert(profile: User): Promise<User> {
    const payload = toDb(profile);
    const { data, error } = await supabase.from(TABLE).upsert(payload, { onConflict: 'id' }).select('*').single();
    if (error || !data) {
      console.error('Profile upsert failed', error);
      return profile;
    }
    return fromDb(data as DbProfile);
  }
};
