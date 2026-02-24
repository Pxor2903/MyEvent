import type { Event, Guest, GuestQualifierKey } from '@/core/types';

export const QUALIFIER_LABELS: Record<GuestQualifierKey, string> = {
  mr_et_mme: 'Mr & Mme',
  plus_enfants: '+ enfants'
};

export const QUALIFIER_OPTIONS: GuestQualifierKey[] = ['mr_et_mme', 'plus_enfants'];

/** Affiche le libellé d'un qualificatif (prédéfini ou texte libre). */
export function formatQualifierLabel(key: string): string {
  return QUALIFIER_LABELS[key as GuestQualifierKey] ?? key;
}

/** True si l'utilisateur (owner ou admin qui a ajouté l'invité) peut modifier/supprimer cet invité. */
export function canEditGuest(guest: Guest, userId: string, event: Event): boolean {
  if (event.creatorId === userId) return true;
  return guest.addedByUserId === userId;
}
