/**
 * Accès données prestataires (profils, documents, messagerie, RDV, admin).
 */
import { supabase } from './client';
import { profilesApi } from './profiles';
import type {
  ProviderProfile,
  ProviderDocument,
  ProviderConversation,
  ProviderMessage,
  Appointment,
  ProviderSearchFilter,
  ProviderCategory,
  ProviderStatus,
} from '@/core/types';

// ============================================================
// PROFILS PRESTATAIRES
// ============================================================

/** Récupère le profil prestataire de l'utilisateur connecté. */
export async function getMyProviderProfile(): Promise<ProviderProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('provider_profiles')
    .select('*, provider_documents(*)')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) return null;
  return mapProviderFromDb(data as Record<string, unknown>);
}

/** Récupère un profil prestataire par son ID. */
export async function getProviderById(id: string): Promise<ProviderProfile | null> {
  const { data, error } = await supabase
    .from('provider_profiles')
    .select('*, provider_documents(*)')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return mapProviderFromDb(data as Record<string, unknown>);
}

/** Recherche de prestataires avec filtres. */
export async function searchProviders(filter: ProviderSearchFilter): Promise<ProviderProfile[]> {
  let query = supabase.from('provider_profiles').select('*').eq('status', 'approved');

  if (filter.category) {
    query = query.eq('category', filter.category);
  }

  if (filter.searchQuery) {
    const q = filter.searchQuery.replace(/%/g, '\\%');
    query = query.or(`business_name.ilike.%${q}%,description.ilike.%${q}%`);
  }

  const { data, error } = await query.order('average_rating', {
    ascending: false,
    nullsFirst: false,
  });

  if (error || !data) return [];
  return data.map((row) => mapProviderFromDb(row as Record<string, unknown>));
}

/** Crée ou met à jour le profil prestataire. */
export async function upsertProviderProfile(
  profile: Partial<ProviderProfile>
): Promise<ProviderProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const dbData = {
    user_id: user.id,
    business_name: profile.businessName ?? '',
    description: profile.description ?? '',
    category: profile.category ?? 'other',
    zone: profile.zone ?? { country: 'France' },
    photos: profile.photos ?? [],
    price_range: profile.priceRange ?? null,
    specifications: profile.specifications ?? [],
    unavailabilities: profile.unavailabilities ?? [],
  };

  const { data, error } = await supabase
    .from('provider_profiles')
    .upsert(dbData, { onConflict: 'user_id' })
    .select('*, provider_documents(*)')
    .maybeSingle();

  if (error || !data) return null;
  return mapProviderFromDb(data as Record<string, unknown>);
}

// ============================================================
// DOCUMENTS JUSTIFICATIFS
// ============================================================

/** Upload un document justificatif dans Supabase Storage. */
export async function uploadProviderDocument(
  providerId: string,
  file: File,
  type: ProviderDocument['type']
): Promise<ProviderDocument | null> {
  const ext = file.name.split('.').pop();
  const path = `provider-docs/${providerId}/${Date.now()}.${ext ?? 'bin'}`;

  const { error: uploadError } = await supabase.storage.from('event-files').upload(path, file);

  if (uploadError) return null;

  const {
    data: { publicUrl },
  } = supabase.storage.from('event-files').getPublicUrl(path);

  const { data, error } = await supabase
    .from('provider_documents')
    .insert({
      provider_id: providerId,
      name: file.name,
      url: publicUrl,
      type,
    })
    .select()
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    providerId: row.provider_id as string,
    name: row.name as string,
    url: row.url as string,
    type: row.type as ProviderDocument['type'],
    uploadedAt: row.uploaded_at as string,
    verified: row.verified as boolean | undefined,
  };
}

// ============================================================
// CONVERSATIONS ET MESSAGES
// ============================================================

function conversationRowToDomain(
  row: Record<string, unknown>,
  userId: string,
  providerDisplayName: string,
  organiserDisplayName: string
): ProviderConversation {
  const nested = row.provider_profiles as { business_name?: string } | undefined;
  return {
    id: row.id as string,
    providerId: row.provider_id as string,
    providerName: nested?.business_name ?? providerDisplayName,
    organiserId: row.organiser_id as string,
    organiserName: organiserDisplayName,
    lastMessage: row.last_message as string | undefined,
    lastMessageAt: row.last_message_at as string | undefined,
    unreadCount:
      userId === row.organiser_id
        ? (row.unread_count_organiser as number)
        : (row.unread_count_provider as number),
    createdAt: row.created_at as string,
  };
}

/** Récupère toutes les conversations de l'utilisateur connecté. */
export async function getMyConversations(): Promise<ProviderConversation[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const providerProfile = await getMyProviderProfile();

  let query = supabase
    .from('provider_conversations')
    .select('*, provider_profiles(business_name)')
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (providerProfile) {
    query = query.or(`organiser_id.eq.${user.id},provider_id.eq.${providerProfile.id}`);
  } else {
    query = query.eq('organiser_id', user.id);
  }

  const { data, error } = await query;
  if (error || !data) return [];

  const rows = data as Record<string, unknown>[];
  const organiserIds = [...new Set(rows.map((c) => c.organiser_id as string))];
  const organiserNames = new Map<string, string>();
  await Promise.all(
    organiserIds.map(async (id) => {
      const p = await profilesApi.getById(id);
      if (p) organiserNames.set(id, `${p.firstName} ${p.lastName}`.trim());
    })
  );

  return rows.map((c) =>
    conversationRowToDomain(
      c,
      user.id,
      '',
      organiserNames.get(c.organiser_id as string) ?? ''
    )
  );
}

/** Crée ou récupère une conversation entre un organisateur et un prestataire. */
export async function getOrCreateConversation(
  providerId: string,
  providerName: string,
  organiserName: string
): Promise<ProviderConversation | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from('provider_conversations')
    .select('*, provider_profiles(business_name)')
    .eq('provider_id', providerId)
    .eq('organiser_id', user.id)
    .maybeSingle();

  if (existing) {
    const row = existing as Record<string, unknown>;
    const organiser = await profilesApi.getById(row.organiser_id as string);
    const oName = organiser ? `${organiser.firstName} ${organiser.lastName}`.trim() : organiserName;
    return conversationRowToDomain(row, user.id, providerName, oName);
  }

  const { data, error } = await supabase
    .from('provider_conversations')
    .insert({
      provider_id: providerId,
      organiser_id: user.id,
    })
    .select('*, provider_profiles(business_name)')
    .maybeSingle();

  if (error || !data) return null;
  return conversationRowToDomain(data as Record<string, unknown>, user.id, providerName, organiserName);
}

/** Récupère les messages d'une conversation. */
export async function getConversationMessages(conversationId: string): Promise<ProviderMessage[]> {
  const { data, error } = await supabase
    .from('provider_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];

  return data.map((m) => {
    const row = m as Record<string, unknown>;
    return {
      id: row.id as string,
      conversationId: row.conversation_id as string,
      senderId: row.sender_id as string,
      senderName: row.sender_name as string,
      content: row.content as string,
      read: row.read as boolean,
      createdAt: row.created_at as string,
    };
  });
}

/** Envoie un message dans une conversation. */
export async function sendProviderMessage(
  conversationId: string,
  content: string,
  senderName: string
): Promise<ProviderMessage | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('provider_messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      sender_name: senderName,
      content,
    })
    .select()
    .maybeSingle();

  if (error || !data) return null;

  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    senderId: row.sender_id as string,
    senderName: row.sender_name as string,
    content: row.content as string,
    read: row.read as boolean,
    createdAt: row.created_at as string,
  };
}

// ============================================================
// RENDEZ-VOUS
// ============================================================

function mapAppointmentFromDb(row: Record<string, unknown>): Appointment {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    providerId: row.provider_id as string,
    organiserId: row.organiser_id as string,
    type: row.type as Appointment['type'],
    status: row.status as Appointment['status'],
    date: row.date as string,
    durationMinutes: row.duration_minutes as number,
    location: row.location as string | undefined,
    videoLink: row.video_link as string | undefined,
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
  };
}

/** Crée un rendez-vous. */
export async function createAppointment(
  appointment: Omit<Appointment, 'id' | 'createdAt' | 'status'>
): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from('appointments')
    .insert({
      conversation_id: appointment.conversationId,
      provider_id: appointment.providerId,
      organiser_id: appointment.organiserId,
      type: appointment.type,
      status: 'pending',
      date: appointment.date,
      duration_minutes: appointment.durationMinutes,
      location: appointment.location,
      notes: appointment.notes,
    })
    .select()
    .maybeSingle();

  if (error || !data) return null;
  return mapAppointmentFromDb(data as Record<string, unknown>);
}

// ============================================================
// ADMIN
// ============================================================

/** [Admin] Récupère tous les prestataires en attente. */
export async function getPendingProviders(): Promise<ProviderProfile[]> {
  const { data, error } = await supabase
    .from('provider_profiles')
    .select('*, provider_documents(*)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data.map((row) => mapProviderFromDb(row as Record<string, unknown>));
}

/** [Admin] Récupère tous les prestataires (tous statuts). */
export async function getAllProviders(): Promise<ProviderProfile[]> {
  const { data, error } = await supabase
    .from('provider_profiles')
    .select('*, provider_documents(*)')
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map((row) => mapProviderFromDb(row as Record<string, unknown>));
}

/** [Admin] Change le statut d'un prestataire. */
export async function updateProviderStatus(
  providerId: string,
  status: ProviderStatus,
  adminNote?: string
): Promise<boolean> {
  const { error } = await supabase
    .from('provider_profiles')
    .update({ status, admin_note: adminNote ?? null })
    .eq('id', providerId);

  return !error;
}

// ============================================================
// MAPPING DB → TypeScript
// ============================================================

function mapDocumentFromDb(row: Record<string, unknown>): ProviderDocument {
  return {
    id: row.id as string,
    providerId: row.provider_id as string,
    name: row.name as string,
    url: row.url as string,
    type: row.type as ProviderDocument['type'],
    uploadedAt: row.uploaded_at as string,
    verified: row.verified as boolean | undefined,
  };
}

function mapProviderFromDb(data: Record<string, unknown>): ProviderProfile {
  const rawDocs = data.provider_documents;
  const documents: ProviderDocument[] = Array.isArray(rawDocs)
    ? rawDocs.map((d) => mapDocumentFromDb(d as Record<string, unknown>))
    : [];

  const photosRaw = data.photos;
  const photos = Array.isArray(photosRaw) ? (photosRaw as string[]) : [];

  return {
    id: data.id as string,
    userId: data.user_id as string,
    firstName: '',
    lastName: '',
    businessName: data.business_name as string,
    description: data.description as string,
    category: data.category as ProviderCategory,
    status: data.status as ProviderStatus,
    adminNote: data.admin_note as string | undefined,
    zone: (data.zone as ProviderProfile['zone']) ?? { country: 'France' },
    photos,
    priceRange: data.price_range as string | undefined,
    specifications: (data.specifications as ProviderProfile['specifications']) ?? [],
    documents,
    unavailabilities: (data.unavailabilities as ProviderProfile['unavailabilities']) ?? [],
    averageRating: data.average_rating != null ? Number(data.average_rating) : undefined,
    reviewCount: (data.review_count as number) ?? 0,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}
