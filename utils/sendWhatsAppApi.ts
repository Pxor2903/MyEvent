/**
 * Envoi groupé WhatsApp via une API backend (Twilio ou autre).
 * Une seule requête envoie le même message à tous les numéros.
 * Configure VITE_WHATSAPP_API_URL (ex. https://ton-app.vercel.app/api/send-whatsapp) pour activer.
 */

const RAW_API_URL = import.meta.env.VITE_WHATSAPP_API_URL as string | undefined;

/** URL normalisée : sans slash final, en HTTPS pour éviter les redirections (POST → GET → 405). */
function getApiUrl(): string | undefined {
  const u = RAW_API_URL?.trim();
  if (!u) return undefined;
  let url = u.replace(/\/+$/, '');
  if (url.startsWith('http://')) url = 'https://' + url.slice(7);
  return url || undefined;
}

const API_URL = getApiUrl();

export function isWhatsAppApiConfigured(): boolean {
  return !!API_URL;
}

export interface SendWhatsAppResult {
  ok: boolean;
  sent?: number;
  failed?: number;
  error?: string;
}

/**
 * Envoie le même message WhatsApp à tous les numéros (E.164) via l’API configurée.
 * Si documentUrl est fourni, l'API l'envoie comme variable {{2}} (template avec pièce jointe document).
*/
export async function sendWhatsAppToMany(
  phoneNumbers: string[],
  message: string,
  documentUrl?: string
): Promise<SendWhatsAppResult> {
  if (!API_URL) {
    return { ok: false, error: 'API WhatsApp non configurée (VITE_WHATSAPP_API_URL)' };
  }
  const numbers = phoneNumbers.filter((n) => n && n.startsWith('+'));
  if (numbers.length === 0) {
    return { ok: false, error: 'Aucun numéro valide' };
  }
  const body: { phoneNumbers: string[]; message: string; documentUrl?: string } = {
    phoneNumbers: numbers,
    message
  };
  if (documentUrl?.trim()) body.documentUrl = documentUrl.trim();
  try {
    console.log('[WhatsApp API] Envoi POST vers:', API_URL);
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      redirect: 'manual'
    });
    if (res.type === 'opaqueredirect' || res.status === 301 || res.status === 302) {
      const msg = 'L’URL de l’API provoque une redirection (POST devient GET → erreur 405). Utilisez HTTPS et pas de slash final : https://votre-app.vercel.app/api/send-whatsapp';
      console.error('[WhatsApp API] Redirection détectée:', res.status, API_URL);
      return { ok: false, error: msg };
    }
    const text = await res.text();
    const trimmed = text?.trim() ?? '';
    if (trimmed.startsWith('<!') || trimmed.startsWith('<html')) {
      const msg = 'L’URL WhatsApp renvoie une page web au lieu de l’API. Vérifiez VITE_WHATSAPP_API_URL (ex. https://votre-app.vercel.app/api/send-whatsapp) et redéployez.';
      console.error('[WhatsApp API] Réponse HTML reçue:', trimmed.slice(0, 200));
      return { ok: false, error: msg };
    }
    const data = trimmed ? (() => { try { return JSON.parse(trimmed); } catch { return {}; } })() : {};
    if (!res.ok) {
      let msg = (data.error as string) || res.statusText || trimmed?.slice(0, 150) || `Erreur ${res.status}`;
      if (res.status === 405) {
        msg = 'Erreur 405 (méthode non autorisée). Vérifiez VITE_WHATSAPP_API_URL : utilisez exactement https://votre-domaine.vercel.app/api/send-whatsapp (HTTPS, pas de slash à la fin). Puis redéployez.';
      }
      console.error('[WhatsApp API]', res.status, msg, trimmed?.slice(0, 200));
      return { ok: false, error: msg };
    }
    return {
      ok: true,
      sent: data.sent ?? numbers.length,
      failed: data.failed ?? 0,
      error: data.error as string | undefined
    };
  } catch (e) {
    const errMsg = (e as Error).message || 'Erreur réseau';
    console.error('[WhatsApp API]', errMsg, e);
    return { ok: false, error: errMsg };
  }
}
