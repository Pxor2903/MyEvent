import type { User } from './user';

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  needsEmailConfirmation?: boolean;
}

export interface RegisterData extends Omit<User, 'id' | 'createdAt' | 'avatar'> {
  password: string;
}

export type AuthMode = 'login' | 'register';
