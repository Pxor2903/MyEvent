/**
 * Page publique : formulaire de réponse à une invitation (lien reçu par SMS/WhatsApp/email).
 * Affiche l’événement et l’invité, permet de confirmer la présence et le nombre de personnes.
 */
import React, { useEffect, useState } from 'react';
import { Logo } from '@/core/constants';

const INVITATION_API = '/api/invitation';
const RESPOND_API = '/api/invitation-respond';

interface InvitationInfo {
  eventId: string;
  eventTitle: string;
  guestFirstName: string;
  guestLastName: string;
  subEvents: { id: string; title: string }[];
}

interface RespondToInvitationProps {
  token: string;
}

export const RespondToInvitation: React.FC<RespondToInvitationProps> = ({ token }) => {
  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [guestCount, setGuestCount] = useState(1);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${INVITATION_API}?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          if (!res.ok) {
            setError(data.error || 'Lien invalide ou expiré');
            setInfo(null);
          } else {
            setInfo(data);
            setError(null);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError('Impossible de charger l’invitation');
          setInfo(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmed === null) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(RESPOND_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          confirmed,
          guestCount: Math.max(1, Math.min(99, guestCount)),
          message: message.trim() || undefined
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setSubmitted(true);
      } else {
        setSubmitError(data.error || 'Envoi impossible. Réessaie.');
      }
    } catch {
      setSubmitError('Erreur réseau. Réessaie.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 px-4">
        <Logo />
        <p className="mt-6 text-slate-500">Chargement…</p>
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 px-4">
        <Logo />
        <p className="mt-6 text-red-600 text-center">{error || 'Lien invalide'}</p>
        <p className="mt-2 text-sm text-slate-500 text-center">Ce lien a peut-être expiré ou a déjà été utilisé.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-sm p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="mt-4 text-lg font-semibold text-slate-900">Réponse enregistrée</h1>
          <p className="mt-2 text-slate-600">Merci. L’organisateur a bien reçu votre réponse.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-50 flex flex-col items-center py-8 px-4 pb-[env(safe-area-inset-bottom)]">
      <Logo />
      <div className="w-full max-w-md mt-8 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h1 className="text-lg font-semibold text-slate-900">Répondre à l’invitation</h1>
          <p className="mt-1 text-slate-600">
            {info.guestFirstName} {info.guestLastName}, vous êtes invité(e) à
          </p>
          <p className="mt-2 font-medium text-teal-700">{info.eventTitle}</p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Présence</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmed(true)}
                className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${confirmed === true ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
              >
                Je viens
              </button>
              <button
                type="button"
                onClick={() => setConfirmed(false)}
                className={`flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${confirmed === false ? 'border-slate-600 bg-slate-100 text-slate-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
              >
                Je ne peux pas
              </button>
            </div>
          </div>
          {confirmed === true && (
            <div>
              <label htmlFor="guestCount" className="block text-sm font-medium text-slate-700 mb-1">
                Nombre de personnes
              </label>
              <input
                id="guestCount"
                type="number"
                min={1}
                max={99}
                value={guestCount}
                onChange={(e) => setGuestCount(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base"
              />
            </div>
          )}
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1">
              Message (optionnel)
            </label>
            <textarea
              id="message"
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex : Merci pour l’invitation…"
              className="w-full min-w-0 rounded-xl border border-slate-200 px-4 py-3 text-base resize-none"
            />
          </div>
          {submitError && <p className="text-sm text-red-600">{submitError}</p>}
          <button
            type="submit"
            disabled={confirmed === null || submitting}
            className="w-full py-3 rounded-xl bg-teal-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Envoi…' : 'Envoyer ma réponse'}
          </button>
        </form>
      </div>
    </div>
  );
};
