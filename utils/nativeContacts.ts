/**
 * Contacts natifs (Capacitor) : iOS / Android.
 * Utilisé quand l'app tourne dans le shell natif (cap run ios / cap run android).
 * Demande la permission au moment du clic, charge la liste, l'UI affiche recherche + cases à cocher → sélection uniquement.
 */

import { Capacitor } from '@capacitor/core';
import type { ImportedContact } from './contactImport';

let Contacts: typeof import('@capacitor-community/contacts').Contacts | null = null;

async function getContactsPlugin() {
  if (Contacts) return Contacts;
  try {
    const m = await import('@capacitor-community/contacts');
    Contacts = m.Contacts;
    return Contacts;
  } catch {
    return null;
  }
}

/** True si on tourne en natif (iOS/Android) et que le plugin contacts est disponible. */
export async function isNativeContactsAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const C = await getContactsPlugin();
  return !!C;
}

/** Charge la liste des contacts (après permission). À utiliser uniquement en natif. Retourne [] si refus ou erreur. */
export async function loadNativeContacts(): Promise<ImportedContact[]> {
  if (!Capacitor.isNativePlatform()) return [];
  const C = await getContactsPlugin();
  if (!C) return [];
  try {
    const status = await C.requestPermissions();
    const allowed = status.contacts === 'granted' || status.contacts === 'limited';
    if (!allowed) return [];
    const { contacts } = await C.getContacts({
      projection: {
        name: true,
        phones: true,
        emails: true,
        postalAddresses: true,
        organization: false,
        birthday: false,
        note: false,
        urls: false,
        image: false
      }
    });
    return (contacts || []).map((c: any) => {
      const name = c.name || {};
      const given = (name.given || '').trim();
      const family = (name.family || '').trim();
      const display = (name.display || '').trim();
      const parts = display ? display.split(/\s+/).filter(Boolean) : [];
      const firstName = given || parts[0] || '';
      const lastName = family || (display ? parts.slice(1).join(' ') : '') || '';
      const phone = (c.phones && c.phones[0] && c.phones[0].number) ? String(c.phones[0].number).replace(/\s/g, '') : '';
      const email = (c.emails && c.emails[0] && c.emails[0].address) ? String(c.emails[0].address) : '';
      const addr = c.postalAddresses && c.postalAddresses[0];
      const address = addr && typeof addr === 'object'
        ? [addr.street, addr.city, addr.region, addr.postcode, addr.country].filter(Boolean).join(', ')
        : undefined;
      return {
        firstName,
        lastName,
        email: email || '',
        phone: phone || '',
        address
      } as ImportedContact;
    });
  } catch (e) {
    console.error('loadNativeContacts', e);
    return [];
  }
}
