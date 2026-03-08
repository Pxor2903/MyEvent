/**
 * POST /api/invitation-respond
 * Public : enregistre la réponse d’un invité (présence + nombre de personnes).
 * Body: { token, confirmed, guestCount?, message? }
 * Met à jour events.guests (status, guestCount) et insert/upsert invitation_responses.
 * Variables Vercel : SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function allowCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOW_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  allowCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Méthode non autorisée' });
    return;
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: 'JSON invalide' });
    return;
  }

  const token = (body.token || '').trim();
  const confirmed = Boolean(body.confirmed);
  const guestCount = Math.max(1, Math.min(99, parseInt(body.guestCount, 10) || 1));
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 500) : null;

  if (!token) {
    res.status(400).json({ error: 'Token requis' });
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
    .select('id, guests, updated_at')
    .eq('id', link.event_id)
    .single();

  if (eventError || !eventRow) {
    res.status(404).json({ error: 'Événement introuvable' });
    return;
  }

  const guests = Array.isArray(eventRow.guests) ? [...eventRow.guests] : [];
  const guestIndex = guests.findIndex((g) => g.id === link.guest_id);
  if (guestIndex === -1) {
    res.status(404).json({ error: 'Invité introuvable' });
    return;
  }

  const guest = guests[guestIndex];
  guests[guestIndex] = {
    ...guest,
    status: confirmed ? 'confirmed' : 'declined',
    guestCount,
    attendance: guest.attendance || {},
  };

  const { error: updateError } = await supabase
    .from('events')
    .update({
      guests,
      updated_at: new Date().toISOString(),
    })
    .eq('id', link.event_id);

  if (updateError) {
    res.status(500).json({ error: 'Impossible d’enregistrer la réponse' });
    return;
  }

  await supabase.from('invitation_responses').upsert(
    {
      event_id: link.event_id,
      guest_id: link.guest_id,
      confirmed,
      guest_count: guestCount,
      message: message || null,
      responded_at: new Date().toISOString(),
    },
    { onConflict: 'event_id,guest_id' }
  );

  res.status(200).json({
    ok: true,
    message: confirmed ? 'Merci, votre présence est enregistrée.' : 'Réponse enregistrée.',
  });
}
