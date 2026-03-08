import type { User } from './user';

export interface KeyMoment {
  id: string;
  time: string;
  label: string;
}

/** Nombre de personnes présentes par sous-événement (subEventId → count). */
export type GuestAttendance = Record<string, number>;

/** Sous-invité (enfant ou adulte) avec prénom et âge optionnels. */
export interface SubGuest {
  type: 'adult' | 'child';
  firstName?: string;
  age?: number;
}

/** Clés prédéfinies pour les qualificatifs (cartons d'invitation). Les autres sont des libellés libres. */
export type GuestQualifierKey = 'mr_et_mme' | 'plus_enfants';

export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: 'pending' | 'confirmed' | 'declined';
  companions: unknown[];
  linkedSubEventIds: string[];
  /** Id du co-organisateur ou créateur qui a ajouté cet invité. Seul lui (ou le propriétaire) peut modifier/supprimer. */
  addedByUserId?: string;
  /** Nombre de personnes couvertes par cette invitation (ex. 1 = seul, 2 = couple, 4 = couple + 2 enfants). Défaut 1. */
  guestCount?: number;
  /** Nombre d'adultes (optionnel, pour détail). */
  adultsCount?: number;
  /** Nombre d'enfants (optionnel). */
  childrenCount?: number;
  /** Détail optionnel : prénoms / âges des sous-invités. */
  subGuests?: SubGuest[];
  /** Qualificatifs pour les cartes : clés prédéfinies (mr_et_mme, plus_enfants) ou libellés personnalisés. */
  qualifiers?: string[];
  /** Présence par sous-événement : subEventId → nombre de personnes présentes. */
  attendance?: GuestAttendance;
}

/** Mission / tâche assignable à un organisateur. */
export interface Mission {
  id: string;
  title: string;
  description?: string;
  /** Organisateur assigné (userId). */
  assignedToUserId?: string;
  status: 'todo' | 'in_progress' | 'done';
  createdAt: string;
}

/** Poste d'allocation de budget (ex. Fleurs 2000 €). */
export interface BudgetAllocation {
  id: string;
  label: string;
  amount: number;
  /** Couleur affichée dans le camembert (hex). */
  color?: string;
}

/** Pièce jointe : document lié à l’événement ou à un sous-événement. */
export interface EventAttachment {
  id: string;
  eventId: string;
  subEventId?: string;
  name: string;
  /** Type / catégorie (invitation, plan, menu, autre). */
  type: string;
  url: string;
  uploadedBy: string;
  createdAt: string;
}

export interface SubEvent {
  id: string;
  title: string;
  date?: string;
  location?: string;
  estimatedGuests: number;
  keyMoments: KeyMoment[];
  /** Couleur de la séquence dans le camembert (hex). Dérivés pour les postes. */
  color?: string;
  /** Répartition du budget par poste (ex. Fleurs, Traiteur). */
  budgetAllocations?: BudgetAllocation[];
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
  /** Code devise (EUR, USD, etc.). */
  currency?: string;
  /** Montant alloué par sous-événement (subEventId → montant). */
  subEventBudgets?: Record<string, number>;
  /** Frais globaux (pour tout l'événement, hors sous-événements). Ex. assurance, location salle. */
  globalBudgetAllocations?: BudgetAllocation[];
  subEvents: SubEvent[];
  guests: Guest[];
  isGuestChatEnabled: boolean;
  date?: string;
  /** Timestamp de dernière mise à jour (pour verrouillage optimiste, concurrence). */
  updatedAt?: string;
  /** Pièces jointes (chargées séparément via API, optionnel côté type). */
  attachments?: EventAttachment[];
  /** Moyen de communication unique pour le partage (documents, invitations). Si défini, seuls les invités avec ce canal ne sont pas « à compléter ». */
  shareChannelPreference?: 'whatsapp' | 'sms' | 'email' | 'all';
  /** Missions / tâches à dispatcher entre les organisateurs. */
  missions?: Mission[];
}
