/**
 * Envoi groupé WhatsApp via une API backend (Twilio ou autre).
 * Une seule requête envoie le même message à tous les numéros.
 * Configure VITE_WHATSAPP_API_URL (ex. https://ton-app.vercel.app/api/send-whatsapp) pour activer.
 */

const API_URL = import.meta.env.VITE_WHATSAPP_API_URL as string | undefined;

export function isWhatsAppApiConfigured(): boolean {
  return !!API_URL?.trim();
}

export interface SendWhatsAppResult {
  ok: boolean;
  sent?: number;
  failed?: number;
  error?: string;
}

/**
 * Envoie le même message WhatsApp à tous les numéros (E.164) via l’API configurée.
 */
export async function sendWhatsAppToMany(phoneNumbers: string[], message: string): Promise<SendWhatsAppResult> {
  if (!API_URL?.trim()) {
    return { ok: false, error: 'API WhatsApp non configurée (VITE_WHATSAPP_API_URL)' };
  }
  const numbers = phoneNumbers.filter((n) => n && n.startsWith('+'));
  if (numbers.length === 0) {
    return { ok: false, error: 'Aucun numéro valide' };
  }
  try {
    const res = await fetch(API_URL.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumbers: numbers, message })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: (data.error as string) || res.statusText || 'Erreur API' };
    }
    return {
      ok: true,
      sent: data.sent ?? numbers.length,
      failed: data.failed ?? 0
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message || 'Erreur réseau' };
  }
}
