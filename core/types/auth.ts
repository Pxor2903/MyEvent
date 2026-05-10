import type { ProviderCategory } from './provider';
import type { User } from './user';

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  needsEmailConfirmation?: boolean;
}

export interface RegisterData extends Omit<User, 'id' | 'createdAt' | 'avatar'> {
  password: string;
  /** Inscription avec intention de compléter le profil prestataire */
  wantsProvider?: boolean;
  /** Catégorie indicative pour l’admin (si wantsProvider) */
  providerCategory?: ProviderCategory;
}

export type AuthMode = 'login' | 'register';
