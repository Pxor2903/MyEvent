/**
 * GET /api/invitation?token=xxx
 * Public : retourne les infos d’une invitation pour afficher le formulaire de réponse.
 * Variables Vercel : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function allowCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOW_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  allowCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  const token = (req.query.token || '').trim();
  if (!token) {
    res.status(400).json({ error: 'Paramètre token requis' });
    return;
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    res.status(500).json({ error: 'Configuration serveur manquante' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: link, error: linkError } = await supabase
    .from('invitation_links')
    .select('event_id, guest_id')
    .eq('token', token)
    .maybeSingle();

  if (linkError || !link) {
    res.status(404).json({ error: 'Lien invalide ou expiré' });
    return;
  }

  const { data: eventRow, error: eventError } = await supabase
    .from('events')
    .select('id, title, sub_events, guests')
    .eq('id', link.event_id)
    .single();

  if (eventError || !eventRow) {
    res.status(404).json({ error: 'Événement introuvable' });
    return;
  }

  const guests = eventRow.guests || [];
  const guest = Array.isArray(guests) ? guests.find((g) => g.id === link.guest_id) : null;
  if (!guest) {
    res.status(404).json({ error: 'Invité introuvable' });
    return;
  }

  // Charger les pièces jointes de type "invitation" liées à l'événement (niveau global)
  const { data: attachmentsRows } = await supabase
    .from('event_attachments')
    .select('id, name, type, url, sub_event_id')
    .eq('event_id', link.event_id);
  const invitationDocs = (attachmentsRows || []).filter(
    (a) => a.type === 'invitation' && (a.sub_event_id === null || a.sub_event_id === undefined)
  );

  const subEvents = eventRow.sub_events || [];
  res.status(200).json({
    eventId: eventRow.id,
    eventTitle: eventRow.title,
    guestFirstName: guest.firstName || '',
    guestLastName: guest.lastName || '',
    subEvents: subEvents.map((s) => ({ id: s.id, title: s.title || 'Séquence' })),
    attachments: invitationDocs.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      url: a.url
    }))
  });
}
