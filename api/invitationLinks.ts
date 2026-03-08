/**
 * Récupère ou crée les liens de réponse à l’invitation pour des invités.
 * Utilisé quand on envoie un document de type « invitation » pour inclure le lien unique par invité.
 */
import { supabase } from './client';

export async function getOrCreateInvitationLinks(
  eventId: string,
  guestIds: string[],
  baseUrl: string
): Promise<Record<string, string>> {
  if (!eventId || !guestIds.length) return {};

  const normalized = baseUrl.replace(/\/+$/, '');
  const result: Record<string, string> = {};

  const { data: existing } = await supabase
    .from('invitation_links')
    .select('guest_id, token')
    .eq('event_id', eventId)
    .in('guest_id', guestIds);

  const byGuest = new Map((existing || []).map((r) => [r.guest_id, r.token]));

  for (const gid of guestIds) {
    let token = byGuest.get(gid);
    if (!token) {
      token = crypto.randomUUID();
      await supabase.from('invitation_links').insert({
        event_id: eventId,
        guest_id: gid,
        token,
      });
    }
    result[gid] = `${normalized}/repondre?token=${token}`;
  }

  return result;
}
