/**
 * Pièces jointes : upload, liste, suppression.
 * Stockage Supabase bucket "event-files" (à créer dans le dashboard si besoin : public, types autorisés pdf, images).
 */
import type { EventAttachment } from '@/core/types';
import { supabase } from './client';

const BUCKET = 'event-files';
const TABLE = 'event_attachments';

type DbRow = {
  id: string;
  event_id: string;
  sub_event_id: string | null;
  name: string;
  type: string;
  url: string;
  uploaded_by: string;
  created_at: string;
};

function fromDb(row: DbRow): EventAttachment {
  return {
    id: row.id,
    eventId: row.event_id,
    subEventId: row.sub_event_id ?? undefined,
    name: row.name,
    type: row.type,
    url: row.url,
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at
  };
}

/** Types de document proposés dans l’UI. */
export const ATTACHMENT_TYPE_LABELS: Record<string, string> = {
  invitation: 'Carte d\'invitation',
  plan: 'Plan',
  menu: 'Menu',
  other: 'Autre'
};

export const attachmentsApi = {
  async listByEvent(eventId: string, subEventId?: string | null): Promise<EventAttachment[]> {
    let query = supabase.from(TABLE).select('*').eq('event_id', eventId).order('created_at', { ascending: false });
    if (subEventId != null && subEventId !== '') {
      query = query.eq('sub_event_id', subEventId);
    } else {
      query = query.is('sub_event_id', null);
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => fromDb(row as DbRow));
  },

  /**
   * Liste toutes les pièces jointes d’un événement (global + par sous-événement).
   * Utile pour l’onglet global Documents.
   */
  async listAllByEvent(eventId: string): Promise<EventAttachment[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => fromDb(row as DbRow));
  },

  /**
   * Upload un fichier : envoi dans le bucket puis création de la ligne en base.
   * path = eventId/subEventId ou eventId/global, filename = unique.
   */
  async upload(
    eventId: string,
    file: File,
    opts: { name?: string; type?: string; subEventId?: string | null; userId: string }
  ): Promise<EventAttachment> {
    const ext = file.name.split('.').pop() || '';
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const pathSegment = opts.subEventId ?? 'global';
    const storagePath = `${eventId}/${pathSegment}/${unique}.${ext}`;

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false
    });

    if (uploadError) {
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('404')) {
        throw new Error('Le bucket "event-files" n’existe pas. Créez-le dans Supabase (Storage) avec accès public.');
      }
      throw new Error(uploadError.message ?? 'Erreur lors de l’upload.');
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    const row = {
      event_id: eventId,
      sub_event_id: opts.subEventId ?? null,
      name: opts.name?.trim() || file.name,
      type: opts.type ?? 'other',
      url: publicUrl,
      uploaded_by: opts.userId
    };

    const { data: inserted, error: insertError } = await supabase.from(TABLE).insert(row).select('*').single();
    if (insertError) throw new Error(insertError.message);
    return fromDb(inserted as DbRow);
  },

  async delete(id: string): Promise<void> {
    const { data: row, error: fetchError } = await supabase.from(TABLE).select('url').eq('id', id).single();
    if (fetchError || !row) throw new Error('Pièce jointe introuvable.');
    const url = row.url as string;
    const pathMatch = url.match(new RegExp(`/${BUCKET}/(.+)$`));
    if (pathMatch) {
      await supabase.storage.from(BUCKET).remove([pathMatch[1]]);
    }
    const { error: deleteError } = await supabase.from(TABLE).delete().eq('id', id);
    if (deleteError) throw new Error(deleteError.message);
  }
};
