/**
 * Option A — Import direct via permissions (iOS CNContactStore / Android ContactsContract).
 * Flux : clic → demande autorisation Contacts → affiche liste avec recherche → coche → importe.
 * Utilisé uniquement en app native (Capacitor iOS/Android).
 *
 * Import statique du plugin pour que le pont natif soit enregistré au chargement de l’app (évite
 * les échecs d’import dynamique dans la WebView iOS). Sur web, le plugin enregistre un stub qui
 * lance "Not implemented" ; on ne l’appelle que si isNativePlatform().
 */

import { Capacitor } from '@capacitor/core';
import { Contacts } from '@capacitor-community/contacts';
import type { ImportedContact } from './contactImport';

export const isNativePlatform = (): boolean => Capacitor.isNativePlatform();

function getContactsPlugin() {
  return Capacitor.isNativePlatform() ? Contacts : null;
}

/** Précharge : sur natif le plugin est déjà chargé (import statique). Conservé pour compatibilité. */
export function preloadContactsPlugin(): void {}

/** True si on est en natif (plugin chargé via import statique). */
export function isNativeContactsAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

export type LoadNativeContactsResult = {
  contacts: ImportedContact[];
  permissionDenied: boolean;
};

/** Timeout pour la demande de permission (laisser le temps à la boîte système d’apparaître). */
const PERMISSION_REQUEST_TIMEOUT_MS = 15000;

/**
 * Option A : demande la permission Contacts, puis charge la liste.
 * On appelle requestPermissions() en premier pour que iOS affiche la boîte et ajoute « Contacts » dans Réglages.
 */
export async function loadNativeContacts(): Promise<LoadNativeContactsResult> {
  const empty = { contacts: [] as ImportedContact[], permissionDenied: false };
  if (!Capacitor.isNativePlatform()) return empty;
  const C = getContactsPlugin();
  if (!C) return empty;
  try {
    const permissionPromise = C.requestPermissions();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('PERMISSION_TIMEOUT')), PERMISSION_REQUEST_TIMEOUT_MS)
    );
    let status: { contacts: string };
    try {
      status = await Promise.race([permissionPromise, timeoutPromise]);
    } catch (e) {
      if ((e as Error)?.message === 'PERMISSION_TIMEOUT') {
        throw new Error(
          'La demande d’accès aux contacts n’a pas abouti. Ouvrez Réglages > MyEvent : si « Contacts » apparaît, autorisez-le puis réessayez. Sinon, réinstallez l’app ou utilisez « Importer depuis un fichier » (vCard) ou Google.'
        );
      }
      throw e;
    }
    const allowed = status.contacts === 'granted' || (status.contacts as string) === 'limited';
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
