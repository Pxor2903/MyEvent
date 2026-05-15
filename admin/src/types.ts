export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin';
}

export type ProviderStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
export type ProviderCategory =
  | 'photographer' | 'videographer' | 'caterer' | 'venue'
  | 'dj' | 'musician' | 'florist' | 'decorator'
  | 'graphic_designer' | 'security' | 'host' | 'transport' | 'other';

export const CATEGORY_LABELS: Record<ProviderCategory, string> = {
  photographer: 'Photographe',
  videographer: 'Vidéaste',
  caterer: 'Traiteur',
  venue: 'Salle / Lieu',
  dj: 'DJ',
  musician: 'Musicien / Orchestre',
  florist: 'Fleuriste',
  decorator: 'Décorateur',
  graphic_designer: 'Graphiste',
  security: 'Sécurité',
  host: 'Animateur',
  transport: 'Transport',
  other: 'Autre',
};

export interface ProviderDocument {
  id: string;
  name: string;
  url: string;
  type: string;
  uploaded_at: string;
  verified: boolean;
}

export interface Provider {
  id: string;
  user_id: string;
  business_name: string;
  description: string;
  category: ProviderCategory;
  status: ProviderStatus;
  admin_note?: string;
  zone: {
    city?: string;
    region?: string;
    country: string;
    radiusKm?: number;
    coversEurope?: boolean;
    coversWorldwide?: boolean;
  };
  photos: string[];
  price_range?: string;
  average_rating?: number;
  review_count: number;
  created_at: string;
  updated_at: string;
  provider_documents?: ProviderDocument[];
  // Infos du profil user (jointure)
  user_email?: string;
  user_first_name?: string;
  user_last_name?: string;
}

export interface AdminAction {
  id: string;
  admin_name: string;
  action_type: string;
  target_name: string;
  note?: string;
  created_at: string;
}

export interface PlatformStats {
  totalUsers: number;
  totalProviders: number;
  pendingProviders: number;
  approvedProviders: number;
  totalEvents: number;
  usersActiveThisMonth: number;
  eventsActive: number;
  usersWithEvents: number;
}
