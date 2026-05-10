/** Catégories de prestataires disponibles sur la plateforme. */
export type ProviderCategory =
  | 'photographer' // Photographe
  | 'videographer' // Vidéaste
  | 'caterer' // Traiteur
  | 'venue' // Salle / lieu
  | 'dj' // DJ
  | 'musician' // Musicien / orchestre / chanteur
  | 'florist' // Fleuriste
  | 'decorator' // Décorateur
  | 'graphic_designer' // Graphiste
  | 'security' // Sécurité
  | 'host' // Animateur / présentateur
  | 'transport' // Transport / limousine
  | 'other'; // Autre

/** Statut du compte prestataire. */
export type ProviderStatus =
  | 'pending' // En attente de validation admin
  | 'approved' // Validé et visible dans l'annuaire
  | 'rejected' // Rejeté (avec motif)
  | 'suspended'; // Suspendu temporairement

/** Zone géographique d'intervention. */
export interface ProviderZone {
  city?: string;
  region?: string;
  country: string;
  /** Rayon d'intervention en km (optionnel). */
  radiusKm?: number;
  /** Le prestataire peut intervenir dans toute l'Europe. */
  coversEurope?: boolean;
  /** Le prestataire peut intervenir partout dans le monde. */
  coversWorldwide?: boolean;
}

/** Caractéristiques spécifiques à la catégorie (clé-valeur flexible). */
export interface ProviderSpecification {
  key: string;
  label: string;
  value: string | number | boolean;
}

/** Document justificatif uploadé par le prestataire. */
export interface ProviderDocument {
  id: string;
  providerId: string;
  name: string;
  url: string;
  type: 'kbis' | 'insurance' | 'portfolio' | 'certification' | 'other';
  uploadedAt: string;
  /** Validé par un admin. */
  verified?: boolean;
}

/** Disponibilité du prestataire (plages bloquées). */
export interface ProviderUnavailability {
  id: string;
  startDate: string;
  endDate: string;
  reason?: string;
}

/** Profil complet d'un prestataire. */
export interface ProviderProfile {
  id: string;
  /** Référence à auth.users.id (même système d'auth que les organisateurs). */
  userId: string;
  /** Prénom et nom (récupérés du profil user). */
  firstName: string;
  lastName: string;
  /** Nom commercial / nom de la société. */
  businessName: string;
  /** Description de l'activité. */
  description: string;
  category: ProviderCategory;
  status: ProviderStatus;
  /** Motif de rejet ou suspension (rempli par l'admin). */
  adminNote?: string;
  zone: ProviderZone;
  /** Photos / visuels du prestataire (URLs Supabase Storage). */
  photos: string[];
  /** Tarif indicatif (ex. "À partir de 500€"). */
  priceRange?: string;
  /** Caractéristiques spécifiques selon la catégorie. */
  specifications: ProviderSpecification[];
  /** Documents justificatifs. */
  documents: ProviderDocument[];
  /** Périodes d'indisponibilité. */
  unavailabilities: ProviderUnavailability[];
  /** Note moyenne (calculée depuis les avis). */
  averageRating?: number;
  /** Nombre d'avis. */
  reviewCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** Avis laissé par un organisateur sur un prestataire. */
export interface ProviderReview {
  id: string;
  providerId: string;
  authorId: string;
  authorName: string;
  eventId?: string;
  rating: number; // 1 à 5
  comment?: string;
  createdAt: string;
}

/** Message entre un organisateur et un prestataire. */
export interface ProviderMessage {
  id: string;
  /** Identifiant de la conversation (providerId + organisateurId). */
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  read: boolean;
  createdAt: string;
}

/** Conversation entre un organisateur et un prestataire. */
export interface ProviderConversation {
  id: string;
  providerId: string;
  providerName: string;
  organiserId: string;
  organiserName: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  createdAt: string;
}

/** Rendez-vous entre organisateur et prestataire. */
export type AppointmentType = 'video' | 'in_person';
export type AppointmentStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';

export interface Appointment {
  id: string;
  conversationId: string;
  providerId: string;
  organiserId: string;
  type: AppointmentType;
  status: AppointmentStatus;
  date: string;
  durationMinutes: number;
  location?: string; // Pour présentiel
  videoLink?: string; // Pour visio (généré plus tard)
  notes?: string;
  createdAt: string;
}

/** Filtre de recherche dans l'annuaire prestataires. */
export interface ProviderSearchFilter {
  category?: ProviderCategory;
  city?: string;
  country?: string;
  radiusKm?: number;
  /** Capacité minimale (pour les salles). */
  minCapacity?: number;
  /** Date de l'événement (pour vérifier les disponibilités). */
  eventDate?: string;
  searchQuery?: string;
}
