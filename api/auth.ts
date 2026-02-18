import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { AuthResponse, RegisterData, User } from '@/core/types';
import { supabase } from './client';
import { profilesApi } from './profiles';

function buildProfileFromAuthUser(authUser: SupabaseUser): User {
  const meta = authUser.user_metadata ?? {};
  const fullName = (meta.full_name ?? meta.name ?? '') as string;
  const parts = String(fullName).split(' ').filter(Boolean);
  const firstName = (meta.first_name ?? parts[0] ?? 'Utilisateur') as string;
  const lastName = (meta.last_name ?? parts.slice(1).join(' ') ?? '') as string;
  return {
    id: authUser.id,
    email: authUser.email ?? '',
    firstName,
    lastName,
    phone: meta.phone ?? undefined,
    street: meta.street ?? undefined,
    city: meta.city ?? undefined,
    zipCode: meta.zip_code ?? undefined,
    createdAt: new Date().toISOString(),
    avatar: meta.avatar_url
  };
}

export const authApi = {
  getProfileFromAuthUser(authUser: SupabaseUser): User {
    return buildProfileFromAuthUser(authUser);
  },

  initSocialProviders(): void {},

  async register(userData: RegisterData): Promise<AuthResponse> {
    const { email, password, ...profileData } = userData;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          full_name: `${profileData.firstName} ${profileData.lastName}`.trim(),
          phone: profileData.phone ?? '',
          street: profileData.street ?? '',
          city: profileData.city ?? '',
          zip_code: profileData.zipCode ?? ''
        }
      }
    });
    if (error) return { success: false, error: error.message };
    const userId = data.user?.id;
    if (!userId) return { success: false, error: 'Création du compte incomplète.' };
    if (!data.session) return { success: true, needsEmailConfirmation: true };
    const profile: User = { ...profileData, id: userId, email, createdAt: new Date().toISOString() };
    await profilesApi.upsert(profile);
    return { success: true, user: profile };
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    const userId = data.user?.id;
    if (!userId) return { success: false, error: 'Session invalide.' };
    let profile = await profilesApi.getById(userId);
    if (!profile) {
      const fallback = buildProfileFromAuthUser(data.user);
      profile = await profilesApi.upsert(fallback);
    }
    return { success: true, user: profile };
  },

  async loginWithProvider(provider: 'google' | 'apple'): Promise<AuthResponse> {
    const origin = window.location.origin;
    const redirectUrl = origin.endsWith('/') ? origin : `${origin}/`;
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('auth_redirect_origin', origin);
    }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: redirectUrl }
    });
    if (error) return { success: false, error: error.message };
    if (import.meta.env.DEV && data?.url) {
      console.info('[Auth] Redirection OAuth vers:', data.url);
      console.info('[Auth] redirectTo envoyé à Supabase:', redirectUrl, '→ Ajoute cette URL exacte dans Supabase → Authentication → URL Configuration → Redirect URLs');
    }
    return { success: true };
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  },

  async getCurrentUser(): Promise<User | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user) return null;
    const profile = await profilesApi.getById(data.session.user.id);
    if (profile) return profile;
    const fallback = buildProfileFromAuthUser(data.session.user);
    return profilesApi.upsert(fallback);
  }
};
