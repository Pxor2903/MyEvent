/**
 * POST /api/invitation-respond
 * Public : enregistre la réponse d’un invité (présence + nombre de personnes).
 * Body rétrocompatible:
 * - ancien: { token, confirmed, guestCount?, message? }
 * - nouveau: { token, subResponses: [{ subEventId, confirmed, guestCount }], message? }
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
  const rawSubResponses = Array.isArray(body.subResponses) ? body.subResponses : null;

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
    .select('id, guests, updated_at, sub_events')
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
  const subEvents = Array.isArray(eventRow.sub_events) ? eventRow.sub_events : [];
  const allSubIds = subEvents.map((s) => s.id).filter(Boolean);
  const linkedIds =
    Array.isArray(guest.linkedSubEventIds) && guest.linkedSubEventIds.length > 0
      ? guest.linkedSubEventIds
      : allSubIds;
  const attendance = { ...(guest.attendance || {}) };

  let finalConfirmed = confirmed;
  let finalGuestCount = guestCount;

  if (rawSubResponses && rawSubResponses.length > 0) {
    const bySubId = new Map();
    rawSubResponses.forEach((r) => {
      const subId = (r?.subEventId || '').toString();
      if (!subId || !linkedIds.includes(subId)) return;
      const subConfirmed = Boolean(r?.confirmed);
      const subCount = Math.max(1, Math.min(99, parseInt(r?.guestCount, 10) || 1));
      bySubId.set(subId, { confirmed: subConfirmed, guestCount: subCount });
    });

    linkedIds.forEach((subId) => {
      const r = bySubId.get(subId);
      if (!r) return;
      attendance[subId] = r.confirmed ? r.guestCount : 0;
    });

    const confirmedCounts = linkedIds
      .map((subId) => Number(attendance[subId] ?? 0))
      .filter((n) => Number.isFinite(n) && n > 0);
    finalConfirmed = confirmedCounts.length > 0;
    finalGuestCount = finalConfirmed ? Math.max(...confirmedCounts) : 1;
  } else {
    // Ancien mode: même réponse appliquée à toutes les séquences liées.
    const presentCount = confirmed ? guestCount : 0;
    linkedIds.forEach((subId) => {
      attendance[subId] = presentCount;
    });
    finalConfirmed = confirmed;
    finalGuestCount = guestCount;
  }

  guests[guestIndex] = {
    ...guest,
    status: finalConfirmed ? 'confirmed' : 'declined',
    guestCount: finalGuestCount,
    attendance,
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
      confirmed: finalConfirmed,
      guest_count: finalGuestCount,
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
