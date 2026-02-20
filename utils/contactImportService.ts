/**
 * Service d’import de contacts unifié : device (picker / Capacitor), Google (People API), fichier VCF/CSV.
 * Choisit les options selon la plateforme et applique normalisation E.164 + déduplication.
 */

import { supabase } from '@/api';
import type { ImportedContact } from './contactImport';
import {
  parseVcf,
  parseCsv,
  parseContactFile,
  pickContactsFromDevice,
  isContactPickerAvailable,
  deduplicateContacts
} from './contactImport';
import { isNativePlatform, loadNativeContacts } from './nativeContacts';

export type ImportSources = {
  fromDevice: boolean;
  fromGoogle: boolean;
  fromFile: true;
  inviteByLink: true;
};

/** Options d’import disponibles selon la plateforme (app native / picker / web). */
export function getAvailableSources(): ImportSources {
  return {
    fromDevice: isContactPickerAvailable() || isNativePlatform(),
    fromGoogle: true,
    fromFile: true,
    inviteByLink: true
  };
}

/** Import depuis l’appareil : Picker (web) ou liste native (Capacitor). En natif, retourne la liste complète pour sélection UI. */
export type ImportFromDeviceResult =
  | { type: 'picker'; contacts: ImportedContact[] }
  | { type: 'native'; contacts: ImportedContact[]; permissionDenied: boolean };

export async function importFromDevice(): Promise<ImportFromDeviceResult> {
  if (isNativePlatform()) {
    const result = await loadNativeContacts();
    const contacts = deduplicateContacts(result.contacts);
    return { type: 'native', contacts, permissionDenied: result.permissionDenied };
  }
  const raw = await pickContactsFromDevice();
  const contacts = deduplicateContacts(raw);
  return { type: 'picker', contacts };
}

/** Import depuis un fichier (VCF ou CSV). Liste normalisée et dédupliquée. */
export async function importFromFile(file: File): Promise<ImportedContact[]> {
  const raw = await parseContactFile(file);
  return deduplicateContacts(raw);
}

/** Résultat Google : contacts ou message d’erreur (non connecté Google, scope manquant, etc.). */
export type ImportFromGoogleResult = { contacts: ImportedContact[]; error?: string };

/**
 * Import depuis Google (People API).
 * Nécessite : connexion Supabase avec provider Google et scope contacts (à ajouter dans Supabase Auth → Google → Scopes : https://www.googleapis.com/auth/contacts.readonly).
 */
export async function importFromGoogle(): Promise<ImportFromGoogleResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const provider = session?.user?.app_metadata?.provider;
    const token = (session as any)?.provider_token;
    if (provider !== 'google' || !token) {
      return { contacts: [], error: 'Connectez-vous avec Google pour importer vos contacts.' };
    }
    const contacts: ImportedContact[] = [];
    let pageToken: string | undefined;
    do {
      const url = new URL('https://people.googleapis.com/v1/people/me/connections');
      url.searchParams.set('personFields', 'names,emailAddresses,phoneNumbers');
      url.searchParams.set('pageSize', '1000');
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      const res = await fetch(String(url), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.text();
        if (res.status === 401) return { contacts: [], error: 'Session Google expirée. Reconnectez-vous avec Google.' };
        if (res.status === 403) return { contacts: [], error: 'Accès contacts non autorisé. Ajoutez le scope dans Supabase (Google) puis reconnectez-vous.' };
        return { contacts: [], error: `Google People API: ${res.status}` };
      }
      const json = await res.json();
      pageToken = json.nextPageToken || undefined;
      const list = json.connections || [];
      for (const p of list) {
        const names = p.names?.[0];
        const given = (names?.givenName || '').trim();
        const family = (names?.familyName || '').trim();
        const display = (names?.displayName || '').trim();
        const firstName = given || (display ? display.split(/\s+/)[0] : '') || '';
        const lastName = family || (display ? display.split(/\s+/).slice(1).join(' ') : '') || '';
        const email = (p.emailAddresses?.[0]?.value || '').trim();
        const phone = (p.phoneNumbers?.[0]?.value || '').replace(/\s/g, '');
        if (!firstName && !lastName && !email && !phone) continue;
        contacts.push({ firstName, lastName, email, phone });
      }
    } while (pageToken);
    return { contacts: deduplicateContacts(contacts) };
  } catch (e) {
    console.error('importFromGoogle', e);
    return { contacts: [], error: (e as Error).message };
  }
}

/** Wrappers explicites VCF / CSV si besoin (sinon importFromFile suffit). */
export async function importFromFileVCF(file: File): Promise<ImportedContact[]> {
  const text = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ''));
    r.onerror = () => reject(r.error);
    r.readAsText(file, 'UTF-8');
  });
  return deduplicateContacts(parseVcf(text));
}

export async function importFromFileCSV(file: File): Promise<ImportedContact[]> {
  const text = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ''));
    r.onerror = () => reject(r.error);
    r.readAsText(file, 'UTF-8');
  });
  return deduplicateContacts(parseCsv(text));
}
