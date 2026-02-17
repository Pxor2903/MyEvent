/**
 * Couche API : accès données (Supabase).
 * Les composants importent dbService, authService et supabase depuis ici.
 */
export { supabase } from './client';
export { profilesApi } from './profiles';
export { eventsApi } from './events';
export { messagesApi } from './messages';
export { authApi } from './auth';

import type { User } from '@/core/types';
import type { ChatMessage, Event } from '@/core/types';
import { authApi } from './auth';
import { eventsApi } from './events';
import { messagesApi } from './messages';
import { profilesApi } from './profiles';

/** Service unifié pour les événements, profils et messages (compatibilité avec l’existant). */
export const dbService = {
  getProfileById: (id: string) => profilesApi.getById(id),
  upsertProfile: (profile: User) => profilesApi.upsert(profile),
  getEventsByUserId: (userId: string) => eventsApi.getByUserId(userId),
  findEventById: (id: string) => eventsApi.getById(id),
  findEventByShareCodeOnly: (code: string) => eventsApi.findByShareCodeOnly(code),
  findEventByShareCodeAndPassword: (code: string, password: string) =>
    eventsApi.findByShareCodeAndPassword(code, password),
  generateUniqueShareCode: () => eventsApi.generateUniqueShareCode(),
  updateEventAtomic: (eventId: string, updateFn: (event: Event) => Event) =>
    eventsApi.updateAtomic(eventId, updateFn),
  saveEvent: (event: Event) => eventsApi.save(event),
  deleteEvent: (eventId: string) => eventsApi.delete(eventId),
  requestOrganizerJoin: (eventId: string, user: User) => eventsApi.requestOrganizerJoin(eventId, user),
  requestJoinByCodeAndPassword: (code: string, password: string, user: User) =>
    eventsApi.requestJoinByCodeAndPassword(code, password, user),
  getMessages: (eventId: string, channelId: string) => messagesApi.get(eventId, channelId),
  saveMessage: (msg: ChatMessage) => messagesApi.save(msg)
};

/** Service d’authentification (compatibilité avec l’existant). */
export const authService = {
  getProfileFromAuthUser: authApi.getProfileFromAuthUser,
  initSocialProviders: authApi.initSocialProviders,
  register: authApi.register,
  login: authApi.login,
  loginWithProvider: authApi.loginWithProvider,
  logout: authApi.logout,
  getCurrentUser: authApi.getCurrentUser
};
