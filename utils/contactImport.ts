/**
 * Import contacts: parsing vCard (.vcf) et CSV, et Contact Picker API (Android).
 * Champs possibles: prénom, nom, email, téléphone, adresse.
 */

export interface ImportedContact {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
}

function trim(s: string): string {
  return (s || '').trim();
}

/** Vérifie si un contact a toutes les infos obligatoires (prénom, nom, et au moins email ou tél). */
export function isContactComplete(c: ImportedContact): boolean {
  return !!trim(c.firstName) && !!trim(c.lastName) && (!!trim(c.email) || !!trim(c.phone));
}

/** Parse un fichier vCard (VCF). Retourne une liste de contacts. */
export function parseVcf(text: string): ImportedContact[] {
  const out: ImportedContact[] = [];
  const cards = text.split(/(?=BEGIN:VCARD)/i).filter(Boolean);
  for (const card of cards) {
    const get = (key: string): string => {
      const re = new RegExp(`^${key}(?:;.*)?:(.*)$`, 'im');
      const m = card.match(re);
      if (!m) return '';
      return (m[1] || '').replace(/\\n/g, '\n').trim();
    };
    const n = get('N').split(';').map(s => s.trim());
    const fn = get('FN');
    const first = n[1] || (fn ? fn.split(/\s+/)[0] : '') || '';
    const last = n[0] || (fn ? fn.split(/\s+/).slice(1).join(' ') : '') || '';
    const tel = get('TEL').replace(/\s/g, '') || '';
    const email = get('EMAIL') || '';
    const adrRaw = get('ADR');
    const address = adrRaw ? adrRaw.split(';').map(s => s.trim()).filter(Boolean).join(', ') : undefined;
    out.push({ firstName: first, lastName: last, email, phone: tel, address });
  }
  return out.filter(c => trim(c.firstName) || trim(c.lastName) || trim(c.email) || trim(c.phone));
}

/** Parse un CSV avec colonnes possibles: prénom, nom, email, téléphone, adresse (ou firstname, lastname, etc.). */
export function parseCsv(text: string): ImportedContact[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].toLowerCase().replace(/\s/g, '');
  const cols = lines[0].split(/[,;\t]/).map(c => c.trim().toLowerCase().replace(/\s/g, ''));
  const idx = (names: string[]) => {
    for (const n of names) {
      const i = cols.findIndex(c => c.includes(n) || n.includes(c));
      if (i >= 0) return i;
    }
    return -1;
  };
  const iFirst = idx(['prenom', 'prénom', 'firstname', 'first']);
  const iLast = idx(['nom', 'lastname', 'last', 'name']);
  const iEmail = idx(['email', 'mail', 'courriel']);
  const iPhone = idx(['phone', 'tel', 'telephone', 'mobile']);
  const iAddr = idx(['adresse', 'address']);
  const out: ImportedContact[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(/[,;\t]/).map(c => c.trim());
    const get = (index: number) => (index >= 0 && index < row.length ? row[index] : '') || '';
    const first = get(iFirst);
    const last = get(iLast);
    if (!first && !last && !get(iEmail) && !get(iPhone)) continue;
    out.push({
      firstName: first,
      lastName: last,
      email: get(iEmail),
      phone: get(iPhone).replace(/\s/g, ''),
      address: iAddr >= 0 ? get(iAddr) : undefined
    });
  }
  return out;
}

/** Détecte le type de fichier et parse. */
export function parseContactFile(file: File): Promise<ImportedContact[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const name = (file.name || '').toLowerCase();
      try {
        if (name.endsWith('.vcf')) resolve(parseVcf(text));
        else if (name.endsWith('.csv')) resolve(parseCsv(text));
        else resolve(parseCsv(text));
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'UTF-8');
  });
}

/** Contact Picker API (Android Chrome). Retourne des contacts si disponible. */
export async function pickContactsFromDevice(): Promise<ImportedContact[]> {
  const nav = navigator as any;
  if (!nav.contacts || !nav.contacts.select) return [];
  const props: ('name' | 'email' | 'tel')[] = ['name', 'email', 'tel'];
  const contacts = await nav.contacts.select(props, { multiple: true });
  return (contacts || []).map((c: any) => {
    const name = (c.name && c.name[0]) || '';
    const parts = name.split(/\s+/).filter(Boolean);
    const first = parts[0] || '';
    const last = parts.slice(1).join(' ') || '';
    return {
      firstName: first,
      lastName: last,
      email: (c.email && c.email[0]) || '',
      phone: (c.tel && c.tel[0]) || ''
    };
  });
}

export function isContactPickerAvailable(): boolean {
  const nav = navigator as any;
  return !!(nav.contacts && nav.contacts.select);
}
