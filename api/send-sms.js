/**
 * Vercel serverless : envoi SMS groupé via Twilio.
 * Variables d’environnement : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM (numéro Twilio au format E.164, ex. +33612345678)
 * Un seul appel envoie le même message à tous les numéros (pas de confirmation manuelle).
 */
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_SMS_FROM; // ex. +33612345678 ou un numéro Twilio

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
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }
  if (!twilioAccountSid || !twilioAuthToken || !twilioFrom) {
    res.status(500).json({
      error: 'Twilio SMS non configuré (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM)'
    });
    return;
  }
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    res.status(400).json({ error: 'JSON invalide' });
    return;
  }
  const { phoneNumbers, message } = body;
  if (!Array.isArray(phoneNumbers) || !phoneNumbers.length || typeof message !== 'string') {
    res.status(400).json({ error: 'phoneNumbers (array) et message (string) requis' });
    return;
  }
  const toNumbers = phoneNumbers
    .map((n) => (typeof n === 'string' ? n.trim() : ''))
    .filter((n) => n && n.startsWith('+'));
  if (!toNumbers.length) {
    res.status(400).json({ error: 'Aucun numéro valide (E.164 avec +)' });
    return;
  }

  let sent = 0;
  let failed = 0;
  const errors = [];
  const auth = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString('base64');

  for (const to of toNumbers) {
    try {
      const r = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic ' + auth
          },
          body: new URLSearchParams({
            To: to,
            From: twilioFrom.trim(),
            Body: message
          }).toString()
        }
      );
      const data = await r.json();
      if (data.sid) {
        sent++;
      } else {
        failed++;
        errors.push(data.message || r.statusText);
      }
    } catch (e) {
      failed++;
      errors.push(e.message);
    }
  }

  res
    .status(200)
    .json({ ok: true, sent, failed, error: errors.length ? errors.slice(0, 3).join('; ') : undefined });
}
