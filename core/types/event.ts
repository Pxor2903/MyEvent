import type { User } from './user';

export interface KeyMoment {
  id: string;
  time: string;
  label: string;
}

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: 'pending' | 'confirmed' | 'declined';
  companions: unknown[];
  linkedSubEventIds: string[];
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
