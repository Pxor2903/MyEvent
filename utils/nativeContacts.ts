/**
 * Option A — Import direct via permissions (iOS CNContactStore / Android ContactsContract).
 * Flux : clic → demande autorisation Contacts → affiche liste avec recherche → coche → importe.
 * Utilisé uniquement en app native (Capacitor iOS/Android).
 */

import { Capacitor } from '@capacitor/core';
import type { ImportedContact } from './contactImport';

export const isNativePlatform = (): boolean => Capacitor.isNativePlatform();

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

/** True si on est en natif et que le plugin contacts est chargé (pour message UI). */
export async function isNativeContactsAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const C = await getContactsPlugin();
  return !!C;
}

export type LoadNativeContactsResult = {
  contacts: ImportedContact[];
  permissionDenied: boolean;
};

/**
 * Option A : demande la permission Contacts, puis charge la liste.
 * À appeler au clic (geste utilisateur). En cas de refus, permissionDenied = true.
 */
export async function loadNativeContacts(): Promise<LoadNativeContactsResult> {
  const empty = { contacts: [] as ImportedContact[], permissionDenied: false };
  if (!Capacitor.isNativePlatform()) return empty;
  const C = await getContactsPlugin();
  if (!C) return empty;
  try {
    const status = await C.requestPermissions();
    const allowed = status.contacts === 'granted' || status.contacts === 'limited';
    if (!allowed) {
      return { contacts: [], permissionDenied: true };
    }
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
    const list = (contacts || []).map((c: any) => {
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
    return { contacts: list, permissionDenied: false };
  } catch (e) {
    console.error('loadNativeContacts', e);
    return empty;
  }
}
