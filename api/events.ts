/**
 * CRUD événements (Supabase table events), partage (code + mot de passe),
 * demande de rejoindre en tant qu’organisateur. Gère aussi les invités et sous-événements.
 */
import type { Event, Guest, Organizer, SubEvent, User } from '@/core/types';
import { supabase } from './client';

const TABLE = 'events';

type DbEvent = {
  id: string;
  share_code: string;
  share_password: string | null;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_period: boolean;
  is_date_tbd: boolean;
  location: string;
  image: string | null;
  creator_id: string;
  organizers: Organizer[];
  category: Event['category'];
  general_guests_count: number;
  budget: number;
  sub_events: SubEvent[];
  guests: Guest[];
  is_guest_chat_enabled: boolean;
};

function fromDb(row: DbEvent): Event {
  return {
    id: row.id,
    shareCode: row.share_code,
    sharePassword: row.share_password ?? '',
    title: row.title,
    description: row.description ?? '',
    startDate: row.start_date ?? undefined,
    endDate: row.end_date ?? undefined,
    isPeriod: row.is_period,
    isDateTBD: row.is_date_tbd,
    location: row.location,
    image: row.image ?? undefined,
    creatorId: row.creator_id,
    organizers: row.organizers ?? [],
    category: row.category,
    generalGuestsCount: row.general_guests_count ?? 0,
    budget: row.budget ?? 0,
    subEvents: row.sub_events ?? [],
    guests: row.guests ?? [],
    isGuestChatEnabled: row.is_guest_chat_enabled,
    date: row.start_date ?? undefined
  };
}

function toDb(event: Event): DbEvent {
  return {
    id: event.id,
    share_code: event.shareCode,
    share_password: event.sharePassword ?? '',
    title: event.title,
    description: event.description ?? null,
    start_date: event.startDate ?? null,
    end_date: event.endDate ?? null,
    is_period: event.isPeriod,
    is_date_tbd: event.isDateTBD,
    location: event.location,
    image: event.image ?? null,
    creator_id: event.creatorId,
    organizers: event.organizers ?? [],
    category: event.category,
    general_guests_count: event.generalGuestsCount ?? 0,
    budget: event.budget ?? 0,
    sub_events: event.subEvents ?? [],
    guests: event.guests ?? [],
    is_guest_chat_enabled: event.isGuestChatEnabled ?? true
  };
}

export const eventsApi = {
  async getByUserId(userId: string): Promise<Event[]> {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error || !data) return [];
    const filtered = data.filter(
      (evt: { creator_id: string; organizers?: { userId: string; status: string }[] }) =>
        evt.creator_id === userId ||
        (evt.organizers ?? []).some((org) => org.userId === userId && org.status === 'confirmed')
    );
    return filtered.map((row) => fromDb(row as DbEvent));
  },

  async getById(id: string): Promise<Event | null> {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
    if (error || !data) return null;
    return fromDb(data as DbEvent);
  },

  async findByShareCodeOnly(code: string): Promise<Event | null> {
    const normalized = code.trim().toUpperCase();
    if (!normalized) return null;
    const { data, error } = await supabase.from(TABLE).select('*').eq('share_code', normalized).single();
    if (error || !data) return null;
    return fromDb(data as DbEvent);
  },

  async findByShareCodeAndPassword(code: string, password: string): Promise<Event | null> {
    const event = await eventsApi.findByShareCodeOnly(code);
    if (!event) return null;
    const stored = (event.sharePassword ?? '').trim();
    const entered = password.trim();
    if (stored !== entered) return null;
    return event;
  },

  async generateUniqueShareCode(): Promise<string> {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let attempt = 0; attempt < 50; attempt++) {
      let code = '';
      for (let i = 0; i < 10; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
      const existing = await eventsApi.findByShareCodeOnly(code);
      if (!existing) return code;
    }
    return crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase();
  },

  async updateAtomic(eventId: string, updateFn: (event: Event) => Event): Promise<Event> {
    const { data: current, error } = await supabase.from(TABLE).select('*').eq('id', eventId).single();
    if (error || !current) throw new Error('Événement introuvable');
    const updatedEvent = updateFn(fromDb(current as DbEvent));
    const payload = toDb(updatedEvent);
    const { data, error: updateError } = await supabase.from(TABLE).update(payload).eq('id', eventId).select('*').single();
    if (updateError || !data) throw new Error(updateError?.message ?? 'Échec de mise à jour');
    return fromDb(data as DbEvent);
  },

  async save(event: Event): Promise<void> {
    const payload = toDb(event);
    const { error } = await supabase.from(TABLE).upsert(payload, { onConflict: 'id' });
    if (error) throw new Error(error.message);
  },

  async delete(eventId: string): Promise<void> {
    const { error } = await supabase.from(TABLE).delete().eq('id', eventId);
    if (error) throw new Error(error.message);
  },

  async requestOrganizerJoin(eventId: string, user: User): Promise<void> {
    await eventsApi.updateAtomic(eventId, (event) => {
      const exists = event.organizers.find((o) => o.userId === user.id);
      if (!exists && event.creatorId !== user.id) {
        event.organizers.push({
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          status: 'pending',
          permissions: ['access_organizer_chat']
        });
      }
      return event;
    });
  },

  async requestJoinByCodeAndPassword(
    code: string,
    password: string,
    user: User
  ): Promise<{ success: boolean; error?: string }> {
    const trimmedCode = code.trim();
    const trimmedPassword = password.trim();
    if (!trimmedCode || !trimmedPassword) return { success: false, error: 'Saisis la clé et le mot de passe.' };
    const { data: eventId, error: errFind } = await supabase.rpc('get_event_id_for_join', {
      p_share_code: trimmedCode,
      p_share_password: trimmedPassword
    });
    if (errFind) {
      console.error('get_event_id_for_join', errFind);
      return { success: false, error: 'Clé ou mot de passe incorrect.' };
    }
    if (!eventId) return { success: false, error: 'Clé ou mot de passe incorrect.' };
    const { error: errAdd } = await supabase.rpc('add_pending_organizer', {
      p_event_id: eventId,
      p_first_name: user.firstName,
      p_last_name: user.lastName
    });
    if (errAdd) {
      console.error('add_pending_organizer', errAdd);
      return { success: false, error: errAdd.message ?? "Impossible d'envoyer la demande." };
    }
    return { success: true };
  }
};
