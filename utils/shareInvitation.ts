/**
 * Partage d'invitations / documents aux invités.
 * Priorité : WhatsApp (si téléphone) → SMS (si téléphone, en secours) → Email (si pas de téléphone ou en dernier recours).
 *
 * Note : Il n'existe pas d'API WhatsApp gratuite pour envoyer des messages à la place de l'utilisateur.
 * Les solutions officielles (WhatsApp Business API, Twilio) nécessitent un compte professionnel et sont payantes.
 * On utilise donc le lien wa.me qui ouvre WhatsApp avec le numéro et le message pré-rempli ; l'utilisateur
 * valide l'envoi. Si le destinataire n'a pas WhatsApp, l'utilisateur peut utiliser le lien SMS à la place.
 */

import type { Guest } from '@/core/types';

/** Numéro au format E.164 pour wa.me / API (chiffres uniquement avec +). Exporté pour l’envoi groupé via API. */
export function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0') && digits.length === 10) return '+33' + digits.slice(1);
  if (digits.length >= 10 && !digits.startsWith('+')) return '+' + digits;
  return digits ? '+' + digits : '';
}

export type ShareChannel = 'whatsapp' | 'sms' | 'email';

export interface ShareOptions {
  /** Canal recommandé pour ce contact (priorité WhatsApp → SMS → Email). */
  preferred: ShareChannel;
  /** URL à ouvrir pour partager via WhatsApp (wa.me). */
  whatsappUrl: string | null;
  /** URL à ouvrir pour partager via SMS (sms:). */
  smsUrl: string | null;
  /** URL à ouvrir pour partager par email (mailto:). */
  emailUrl: string | null;
  /** Infos manquantes pour ce contact (ex. ['phone'] si pas de téléphone, ['email'] si pas d'email). */
  missing: ('phone' | 'email')[];
  /** True si au moins un canal est disponible. */
  canShare: boolean;
}

/**
 * Construit les options de partage pour un invité.
 * Priorité : 1) WhatsApp (téléphone), 2) SMS (téléphone), 3) Email.
 * Si pas de téléphone → email uniquement. Si ni téléphone ni email → canShare false, missing ['phone','email'].
 */
export function getShareOptionsForGuest(
  guest: Guest,
  message: string,
  options?: { subject?: string; documentUrl?: string }
): ShareOptions {
  const subject = options?.subject ?? 'Invitation';
  const doc = options?.documentUrl ? `\n\n${options.documentUrl}` : '';
  const fullMessage = message + doc;
  const missing: ('phone' | 'email')[] = [];
  const phone = (guest.phone ?? '').trim();
  const email = (guest.email ?? '').trim();
  const hasPhone = phone.length >= 10;
  const hasEmail = email.length > 0;

  if (!hasPhone) missing.push('phone');
  if (!hasEmail) missing.push('email');

  let whatsappUrl: string | null = null;
  let smsUrl: string | null = null;
  let emailUrl: string | null = null;

  if (hasPhone) {
    const e164 = toE164(phone);
    if (e164) {
      whatsappUrl = `https://wa.me/${e164.replace('+', '')}?text=${encodeURIComponent(fullMessage)}`;
      smsUrl = `sms:${e164}?body=${encodeURIComponent(fullMessage)}`;
    }
  }
  if (hasEmail) {
    emailUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(fullMessage)}`;
  }

  const preferred: ShareChannel = hasPhone ? 'whatsapp' : hasEmail ? 'email' : 'sms';
  const canShare = !!(whatsappUrl || smsUrl || emailUrl);

  return {
    preferred,
    whatsappUrl,
    smsUrl,
    emailUrl,
    missing,
    canShare
  };
}

/**
 * Ouvre le canal de partage préféré pour un invité (WhatsApp, sinon SMS, sinon email).
 * Si aucun canal disponible, retourne false.
 */
export function openPreferredShare(guest: Guest, message: string, options?: { subject?: string; documentUrl?: string }): boolean {
  const opts = getShareOptionsForGuest(guest, message, options);
  if (!opts.canShare) return false;
  const url = opts.whatsappUrl ?? opts.smsUrl ?? opts.emailUrl;
  if (url) {
    import('@/utils/openExternalUrl').then(({ openExternalUrl }) => openExternalUrl(url));
    return true;
  }
  return false;
}

export interface ShareToAllGuestEntry {
  guest: Guest;
  preferred: ShareChannel;
  whatsappUrl: string | null;
  smsUrl: string | null;
  emailUrl: string | null;
  canShare: boolean;
  missing: ('phone' | 'email')[];
}

export interface PendingContactUpdate {
  guest: Guest;
  missing: ('phone' | 'email')[];
}

/**
 * Pour "Partager à tous" : répartit les invités par canal (priorité WhatsApp → SMS → email)
 * et identifie les contacts à compléter (aucun moyen de contact).
 * Règle "un seul canal" : si onlyChannel est défini, les invités qui ont ce canal ne sont pas en pending.
 */
export function getShareToAllData(
  guests: Guest[],
  message: string,
  options?: { subject?: string; documentUrl?: string; onlyChannel?: ShareChannel }
): { entries: ShareToAllGuestEntry[]; pending: PendingContactUpdate[] } {
  const entries: ShareToAllGuestEntry[] = [];
  const pending: PendingContactUpdate[] = [];
  const onlyChannel = options?.onlyChannel;

  for (const guest of guests) {
    const opts = getShareOptionsForGuest(guest, message, options);
    entries.push({
      guest,
      preferred: opts.preferred,
      whatsappUrl: opts.whatsappUrl,
      smsUrl: opts.smsUrl,
      emailUrl: opts.emailUrl,
      canShare: opts.canShare,
      missing: opts.missing
    });
    if (!opts.canShare) {
      pending.push({ guest, missing: opts.missing });
    } else if (onlyChannel) {
      const hasPreferred =
        (onlyChannel === 'whatsapp' && opts.whatsappUrl) ||
        (onlyChannel === 'sms' && opts.smsUrl) ||
        (onlyChannel === 'email' && opts.emailUrl);
      if (!hasPreferred) {
        pending.push({ guest, missing: opts.missing });
      }
    }
  }

  return { entries, pending };
}
