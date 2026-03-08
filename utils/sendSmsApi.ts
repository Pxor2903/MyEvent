/**
 * Envoi SMS groupé via une API backend (Twilio).
 * Un seul clic envoie le même message à tous les numéros, sans confirmation manuelle.
 * Configure VITE_SMS_API_URL (ex. https://ton-app.vercel.app/api/send-sms) pour activer.
 */

const RAW_API_URL = import.meta.env.VITE_SMS_API_URL as string | undefined;

function getApiUrl(): string | undefined {
  const u = RAW_API_URL?.trim();
  if (!u) return undefined;
  let url = u.replace(/\/+$/, '');
  if (url.startsWith('http://')) url = 'https://' + url.slice(7);
  return url || undefined;
}

const API_URL = getApiUrl();

export function isSmsApiConfigured(): boolean {
  return !!API_URL;
}

export interface SendSmsResult {
  ok: boolean;
  sent?: number;
  failed?: number;
  error?: string;
}

/**
 * Envoie un message (ou des messages personnalisés) à tous les numéros.
 * Si messages est fourni et a la même longueur que phoneNumbers, chaque destinataire reçoit messages[i].
 */
export async function sendSmsToMany(
  phoneNumbers: string[],
  message: string,
  messages?: string[]
): Promise<SendSmsResult> {
  if (!API_URL) {
    return { ok: false, error: 'API SMS non configurée (VITE_SMS_API_URL)' };
  }
  const numbers = phoneNumbers.filter((n) => n && n.startsWith('+'));
  if (numbers.length === 0) {
    return { ok: false, error: 'Aucun numéro valide' };
  }
  const body =
    Array.isArray(messages) && messages.length === numbers.length
      ? { phoneNumbers: numbers, messages }
      : { phoneNumbers: numbers, message };
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      redirect: 'manual'
    });
    if (res.type === 'opaqueredirect' || res.status === 301 || res.status === 302) {
      return { ok: false, error: 'L’URL SMS provoque une redirection. Utilisez HTTPS et pas de slash final.' };
    }
    const text = await res.text();
    const trimmed = text?.trim() ?? '';
    if (trimmed.startsWith('<!') || trimmed.startsWith('<html')) {
      return { ok: false, error: 'L’URL renvoie une page web au lieu de l’API. Vérifiez VITE_SMS_API_URL.' };
    }
    const data = trimmed ? (() => { try { return JSON.parse(trimmed); } catch { return {}; } })() : {};
    if (!res.ok) {
      const msg = (data.error as string) || res.statusText || trimmed?.slice(0, 150) || `Erreur ${res.status}`;
      return { ok: false, error: msg };
    }
    return {
      ok: true,
      sent: data.sent ?? numbers.length,
      failed: data.failed ?? 0,
      error: data.error as string | undefined
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message || 'Erreur réseau' };
  }
}
