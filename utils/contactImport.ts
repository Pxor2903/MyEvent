/**
 * Import contacts: parsing vCard (.vcf) et CSV, et Contact Picker API (Android / iOS si activé).
 * - Picker : l'utilisateur ouvre la liste native, coche les contacts voulus, valide → on ne reçoit que la sélection.
 * - Fichier : l'utilisateur importe un .vcf/.csv exporté de son carnet → on parse et affiche pour édition avant ajout.
 * Aucune synchro ni accès au carnet complet ; uniquement ce que l'utilisateur choisit d'importer.
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

/**
 * Parse un CSV avec colonnes: prénom, nom, email, téléphone, adresse.
 * Colonne optionnelle "accompagnants" / "companions" / "nombre": nombre (ex: 2) ou noms (ex: "M. Dupont, Mme Dupont")
 * → génère un contact principal + un contact par accompagnant (même email/tél si non précisé).
 */
export function parseCsv(text: string): ImportedContact[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const rawHeader = lines[0];
  const cols = rawHeader.split(/[,;\t]/).map(c => c.trim().toLowerCase().replace(/\s/g, ''));
  const idx = (names: string[]) => {
    for (const n of names) {
      const i = cols.findIndex(c => c.includes(n) || n.includes(c));
      if (i >= 0) return i;
    }
    return -1;
  };
  const iFirst = idx(['prenom', 'prénom', 'firstname', 'first', 'prenoms']);
  const iLast = idx(['nom', 'lastname', 'last', 'name', 'noms', 'famille']);
  const iEmail = idx(['email', 'mail', 'courriel', 'e-mail']);
  const iPhone = idx(['phone', 'tel', 'telephone', 'mobile', 'portable', 'numero', 'numéro']);
  const iAddr = idx(['adresse', 'address']);
  const iCompanions = idx(['accompagnants', 'companions', 'nombre', 'nb', 'invites', 'invités', 'plus']);
  const out: ImportedContact[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(/[,;\t]/).map(c => c.trim());
    const get = (index: number) => (index >= 0 && index < row.length ? row[index] : '') || '';
    const first = get(iFirst);
    const last = get(iLast);
    const email = get(iEmail);
    const phone = get(iPhone).replace(/\s/g, '');
    const address = iAddr >= 0 ? get(iAddr) : undefined;
    if (!first && !last && !email && !phone) continue;
    const main: ImportedContact = { firstName: first, lastName: last, email, phone, address };
    out.push(main);
    const compRaw = iCompanions >= 0 ? get(iCompanions) : '';
    if (!compRaw) continue;
    const compNum = parseInt(compRaw, 10);
    if (!Number.isNaN(compNum) && compNum > 0) {
      for (let k = 1; k < compNum; k++) {
        out.push({
          firstName: `Invité ${k + 1}`,
          lastName: last || '—',
          email,
          phone,
          address
        });
      }
      continue;
    }
    const names = compRaw.split(/[,;\/]+/).map(s => s.trim()).filter(Boolean);
    for (const name of names) {
      const parts = name.split(/\s+/).filter(Boolean);
      const cFirst = parts[0] || 'Invité';
      const cLast = parts.slice(1).join(' ') || last || '—';
      out.push({ firstName: cFirst, lastName: cLast, email, phone, address });
    }
  }
  return out;
}

/** Détecte le type de fichier et parse. Accepte .vcf, .csv, .txt (CSV). */
export function parseContactFile(file: File): Promise<ImportedContact[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const name = (file.name || '').toLowerCase();
      try {
        if (name.endsWith('.vcf')) resolve(parseVcf(text));
        else resolve(parseCsv(text));
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'UTF-8');
  });
}

/**
 * Contact Picker API : ouvre la liste des contacts de l'appareil (natif du navigateur).
 * L'utilisateur sélectionne un ou plusieurs contacts puis valide.
 * Supporté : Chrome Android (HTTPS, geste utilisateur requis). Non supporté : Safari iOS, Firefox.
 */
export async function pickContactsFromDevice(): Promise<ImportedContact[]> {
  const nav = navigator as any;
  const contactsApi = nav.contacts;
  if (!contactsApi || typeof contactsApi.select !== 'function') return [];
  try {
    const props = ['name', 'email', 'tel', 'address'] as const;
    const contacts = await contactsApi.select(props, { multiple: true });
    return (contacts || []).map((c: any) => {
      const name = (c.name && c.name[0]) || '';
      const parts = name.split(/\s+/).filter(Boolean);
      const first = parts[0] || '';
      const last = parts.slice(1).join(' ') || '';
      const addr = c.address && c.address[0];
      const addressStr = addr && typeof addr === 'object'
        ? [addr.addressLine, addr.city, addr.region, addr.postalCode, addr.country].filter(Boolean).join(', ')
        : (typeof addr === 'string' ? addr : undefined);
      return {
        firstName: first,
        lastName: last,
        email: (c.email && c.email[0]) || '',
        phone: (c.tel && c.tel[0]) || '',
        address: addressStr
      };
    });
  } catch {
    return [];
  }
}

export function isContactPickerAvailable(): boolean {
  const nav = navigator as any;
  return !!(nav.contacts && typeof nav.contacts.select === 'function');
}
