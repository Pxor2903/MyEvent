import type { User } from './user';

export interface KeyMoment {
  id: string;
  time: string;
  label: string;
}

/** Nombre de personnes présentes par sous-événement (subEventId → count). */
export type GuestAttendance = Record<string, number>;

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: 'pending' | 'confirmed' | 'declined';
  companions: unknown[];
  linkedSubEventIds: string[];
  /** Nombre de personnes couvertes par cette invitation (ex. 1 = seul, 2 = couple, 4 = couple + 2 enfants). Défaut 1. */
  guestCount?: number;
  /** Présence par sous-événement : subEventId → nombre de personnes présentes. */
  attendance?: GuestAttendance;
}

export interface SubEvent {
  id: string;
  title: string;
  date?: string;
  location?: string;
  estimatedGuests: number;
  keyMoments: KeyMoment[];
}

export type Permission =
  | 'edit_details'
  | 'manage_subevents'
  | 'manage_guests'
  | 'access_organizer_chat'
  | 'view_budget'
  | 'all';

export interface Organizer {
  userId: string;
  firstName: string;
  lastName: string;
  status: 'pending' | 'confirmed';
  permissions: Permission[];
  allowedSubEventIds?: string[];
}

export interface Event {
  id: string;
  shareCode: string;
  sharePassword: string;
  title: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isPeriod: boolean;
  isDateTBD: boolean;
  location: string;
  image?: string;
  creatorId: string;
  organizers: Organizer[];
  category: 'Business' | 'Social' | 'Sport' | 'Culture';
  generalGuestsCount: number;
  budget: number;
  subEvents: SubEvent[];
  guests: Guest[];
  isGuestChatEnabled: boolean;
  date?: string;
}
