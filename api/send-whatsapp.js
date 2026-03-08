/**
 * Vercel serverless : envoi WhatsApp groupé via Twilio.
 * Variables d’environnement sur Vercel :
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM (ex. whatsapp:+14155238886)
 * En production (hors sandbox) : TWILIO_WHATSAPP_CONTENT_SID (ex. HXxxx) — template approuvé avec variable {{1}} pour le message.
 * CORS : autorise ton domaine front (ou * en dev).
 */
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_WHATSAPP_FROM; // ex. whatsapp:+14155238886
const contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID; // ex. HXxxx — si défini, envoi via template (production)

function allowCors(res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOW_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  allowCors(res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({
      error: 'Method not allowed. Use POST. If the app sends POST but you see 405, the request may have been redirected (use HTTPS and no trailing slash in VITE_WHATSAPP_API_URL).'
    });
    return;
  }
  if (!twilioAccountSid || !twilioAuthToken || !twilioFrom) {
    res.status(500).json({ error: 'Twilio non configuré (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)' });
    return;
  }
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: 'JSON invalide' });
    return;
  }
  const { phoneNumbers, message, messages, documentUrl } = body;
  const usePersonalized = Array.isArray(messages) && messages.length === phoneNumbers?.length;
  if (!Array.isArray(phoneNumbers) || !phoneNumbers.length) {
    res.status(400).json({ error: 'phoneNumbers (array) requis' });
    return;
  }
  if (!usePersonalized && typeof message !== 'string') {
    res.status(400).json({ error: 'message (string) requis, ou messages (array) de même longueur que phoneNumbers' });
    return;
  }
  const hasDocumentUrl = typeof documentUrl === 'string' && documentUrl.trim().length > 0;
  const toNumbers = phoneNumbers
    .map((n) => (typeof n === 'string' ? n.trim() : ''))
    .filter((n) => n && n.startsWith('+'));
  if (!toNumbers.length) {
    res.status(400).json({ error: 'Aucun numéro valide (E.164 avec +)' });
    return;
  }
  if (usePersonalized && toNumbers.length !== messages.length) {
    res.status(400).json({ error: 'messages doit avoir la même longueur que phoneNumbers' });
    return;
  }
  const useTemplate = !!contentSid?.trim();

  let sent = 0;
  let failed = 0;
  const errors = [];
  for (let i = 0; i < toNumbers.length; i++) {
    const to = toNumbers[i];
    const msgText = usePersonalized ? (typeof messages[i] === 'string' ? messages[i] : message) : message;
    const toWhatsApp = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const bodyParams = { To: toWhatsApp, From: twilioFrom };
    if (useTemplate) {
      bodyParams.ContentSid = contentSid.trim();
      bodyParams.ContentVariables = JSON.stringify(
        hasDocumentUrl ? { 1: msgText, 2: documentUrl.trim() } : { 1: msgText }
      );
    } else {
      bodyParams.Body = msgText;
    }
    try {
      const r = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic ' + Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64')
          },
          body: new URLSearchParams(bodyParams).toString()
        }
      );
      const data = await r.json();
      if (data.sid) {
        sent++;
      } else {
        failed++;
        const twilioMsg = data.message || data.error_message || r.statusText;
        const twilioCode = data.code ? ` [${data.code}]` : '';
        errors.push(twilioMsg + twilioCode);
      }
    } catch (e) {
      failed++;
      errors.push(e.message);
    }
  }
  res.status(200).json({ ok: true, sent, failed, error: errors.length ? errors.slice(0, 3).join('; ') : undefined });
}
