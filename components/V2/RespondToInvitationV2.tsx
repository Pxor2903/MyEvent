import React, { useEffect, useState } from 'react';
import { Logo } from '@/core/constants';
import { useAsyncAction } from './useAsyncAction';

const INVITATION_API = '/api/invitation';
const RESPOND_API = '/api/invitation-respond';

interface InvitationInfo {
  eventId: string;
  eventTitle: string;
  guestFirstName: string;
  guestLastName: string;
  subEvents: { id: string; title: string }[];
  subEventResponses?: { subEventId: string; confirmed: boolean; guestCount: number }[];
  attachments?: { id: string; name: string; type: string; url: string; subEventId?: string | null }[];
}

export const RespondToInvitationV2: React.FC<{ token: string }> = ({ token }) => {
  const [info, setInfo] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [confirmed, setConfirmed] = useState<boolean | null>(null);
  const [guestCount, setGuestCount] = useState<string>('1'); // string pour permettre d’effacer
  const [subResponses, setSubResponses] = useState<Record<string, { confirmed: boolean | null; guestCount: string }>>({});
  const [message, setMessage] = useState('');
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [deepLinkStatus, setDeepLinkStatus] = useState<'idle' | 'trying' | 'fallback'>('idle');

  const { pending: submitting, run: runSubmit } = useAsyncAction();
  const openInApp = (isAuto = false) => {
    const appUrl = `myevent://repondre?token=${encodeURIComponent(token)}`;
    setDeepLinkStatus('trying');
    const start = Date.now();
    const timer = window.setTimeout(() => {
      if (Date.now() - start > 1000) {
        setDeepLinkStatus('fallback');
      }
    }, 1200);
    window.location.href = appUrl;
    if (!isAuto) {
      window.setTimeout(() => {
        window.clearTimeout(timer);
      }, 2000);
    }
  };

  useEffect(() => {
    const ua = navigator.userAgent || '';
    const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
    if (!isMobile) return;
    const autoKey = `invite:auto-open:${token}`;
    if (window.sessionStorage.getItem(autoKey) === '1') return;
    window.sessionStorage.setItem(autoKey, '1');
    const t = window.setTimeout(() => openInApp(true), 500);
    return () => window.clearTimeout(t);
  }, [token]);

  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${INVITATION_API}?token=${encodeURIComponent(token)}`);
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok) {
          setError(data.error || 'Lien invalide ou expiré');
          setInfo(null);
          return;
        }

        setInfo(data);
        if (Array.isArray(data.subEvents)) {
          const initial: Record<string, { confirmed: boolean | null; guestCount: string }> = {};
          const respMap = new Map(
            (Array.isArray(data.subEventResponses) ? data.subEventResponses : []).map((r: any) => [
              r.subEventId,
              { confirmed: Boolean(r.confirmed), guestCount: String(Math.max(1, Math.min(99, Number(r.guestCount) || 1))) }
            ])
          );
          data.subEvents.forEach((s: any) => {
            initial[s.id] = respMap.get(s.id) ?? { confirmed: null, guestCount: '1' };
          });
          setSubResponses(initial);
        }
        setError(null);
      } catch {
        if (!cancelled) {
          setError('Impossible de charger l’invitation');
          setInfo(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmed === null) return;

    const parsedGuestCount = confirmed ? Math.max(1, Math.min(99, parseInt(guestCount, 10) || 0)) : 1;
    if (confirmed && (!guestCount.trim() || !parsedGuestCount)) {
      setSubmitError('Merci d’indiquer le nombre de personnes.');
      return;
    }

    setSubmitError(null);
    const hasSubEvents = Array.isArray(info?.subEvents) && info!.subEvents.length > 0;
    let payload: any = {
      token,
      confirmed,
      guestCount: parsedGuestCount,
      message: message.trim() || undefined
    };

    if (hasSubEvents) {
      const rows = info!.subEvents.map((s) => ({
        subEventId: s.id,
        confirmed: Boolean(subResponses[s.id]?.confirmed),
        guestCount: Math.max(1, Math.min(99, parseInt(subResponses[s.id]?.guestCount || '1', 10) || 1))
      }));
      const hasMissing = rows.some((r) => subResponses[r.subEventId]?.confirmed === null);
      if (hasMissing) {
        setSubmitError('Merci de répondre à chaque sous-événement.');
        return;
      }
      payload = {
        token,
        subResponses: rows,
        message: message.trim() || undefined
      };
    }

    await runSubmit(async () => {
      try {
        const res = await fetch(RESPOND_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          setSubmitted(true);
        } else {
          setSubmitError(data.error || 'Envoi impossible. Réessaie.');
        }
      } catch {
        setSubmitError('Erreur réseau. Réessaie.');
      }
    });
  };

  const doc = info?.attachments?.[selectedDocIndex] ?? info?.attachments?.[0];
  const isImage = doc ? /\.(png|jpe?g|gif|webp)$/i.test(doc.url) : false;
  const isPdf = doc ? /\.pdf$/i.test(doc.url) : false;

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
      <div className="min-h-screen min-h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 to-slate-900 text-white px-4">
        <div className="w-12 h-12 rounded-full bg-emerald-400/15 flex items-center justify-center border border-emerald-300/20">
          <svg className="w-6 h-6 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mt-5 text-lg font-semibold">Réponse enregistrée</h1>
        <p className="mt-2 text-sm text-white/70 text-center">Merci. L’organisateur a bien reçu votre réponse.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 flex flex-col">
      <header className="px-4 sm:px-6 pt-[env(safe-area-inset-top)] pb-3 flex items-center justify-between">
        <Logo />
        <div className="text-right">
          <p className="text-[11px] font-black uppercase tracking-widest text-white/50">Invitation</p>
          <p className="text-sm font-semibold text-white/80 truncate max-w-[60vw]">{info.eventTitle}</p>
        </div>
      </header>

      <div className="px-4 sm:px-6">
        <button
          type="button"
          onClick={() => openInApp(false)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-2xl border border-white/20 bg-white/10 text-white text-sm font-semibold hover:bg-white/15"
        >
          Ouvrir dans l’application
        </button>
        {deepLinkStatus === 'trying' && (
          <p className="mt-2 text-xs text-white/70">Ouverture de l’application…</p>
        )}
        {deepLinkStatus === 'fallback' && (
          <p className="mt-2 text-xs text-white/70">Application non détectée. Continue sur le web.</p>
        )}
      </div>

      {/* Document full-bleed */}
      <div className="w-full bg-black/20 border-y border-white/5">
        {doc ? (
          isImage ? (
            <img src={doc.url} alt={doc.name} className="w-full h-[44vh] sm:h-[48vh] object-contain bg-slate-950" />
          ) : (
            <iframe
              src={doc.url}
              title={doc.name}
              className="w-full h-[44vh] sm:h-[48vh] border-0 bg-slate-50"
            />
          )
        ) : (
          <div className="w-full h-[44vh] sm:h-[48vh] flex items-center justify-center text-white/60 text-sm">
            Document indisponible
          </div>
        )}
      </div>
      {Array.isArray(info.attachments) && info.attachments.length > 1 && (
        <div className="px-4 sm:px-6 py-3 flex flex-wrap gap-2">
          {info.attachments.map((a, idx) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelectedDocIndex(idx)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                selectedDocIndex === idx
                  ? 'bg-white text-slate-900 border-white'
                  : 'bg-white/10 text-white border-white/20'
              }`}
              title={a.name}
            >
              {a.subEventId
                ? info.subEvents.find((s) => s.id === a.subEventId)?.title || `Carte séquence ${idx + 1}`
                : `Carte globale ${idx + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* Bottom-sheet RSVP */}
      <div className="mt-auto pb-[env(safe-area-inset-bottom)]">
        <div className="w-full max-w-2xl mx-auto px-4">
          <div className="bg-white text-slate-900 rounded-t-3xl sm:rounded-t-[2.5rem] border border-slate-200 shadow-2xl overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100">
              <h1 className="text-lg sm:text-xl font-semibold">Répondre</h1>
              <p className="mt-1 text-sm text-slate-600">
                {info.guestFirstName} {info.guestLastName}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-2">Présence globale</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirmed(true)}
                    className={`w-full py-3 rounded-2xl border-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                      confirmed === true
                        ? 'border-teal-600 bg-teal-50 text-teal-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Je viens
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmed(false)}
                    className={`w-full py-3 rounded-2xl border-2 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                      confirmed === false
                        ? 'border-slate-700 bg-slate-100 text-slate-800'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Je ne peux pas
                  </button>
                </div>
              </div>

              {confirmed === true && (
                <div>
                  <label htmlFor="guestCount" className="block text-sm font-semibold text-slate-800 mb-2">
                    Nombre de personnes
                  </label>
                  <input
                    id="guestCount"
                    type="number"
                    min={1}
                    max={99}
                    value={guestCount}
                    onChange={(e) => setGuestCount(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base"
                    inputMode="numeric"
                  />
                </div>
              )}

              {Array.isArray(info.subEvents) && info.subEvents.length > 0 && (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-slate-800">Réponses par sous-événement</label>
                  {info.subEvents.map((s) => {
                    const r = subResponses[s.id] ?? { confirmed: null, guestCount: '1' };
                    return (
                      <div key={s.id} className="rounded-2xl border border-slate-200 p-3">
                        <p className="text-sm font-semibold text-slate-900">{s.title}</p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setSubResponses((p) => ({ ...p, [s.id]: { ...r, confirmed: true } }))}
                            className={`py-2 rounded-xl border text-sm font-semibold ${r.confirmed === true ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600'}`}
                          >
                            Oui
                          </button>
                          <button
                            type="button"
                            onClick={() => setSubResponses((p) => ({ ...p, [s.id]: { ...r, confirmed: false } }))}
                            className={`py-2 rounded-xl border text-sm font-semibold ${r.confirmed === false ? 'border-slate-700 bg-slate-100 text-slate-800' : 'border-slate-200 text-slate-600'}`}
                          >
                            Non
                          </button>
                        </div>
                        {r.confirmed === true && (
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={r.guestCount}
                            onChange={(e) => setSubResponses((p) => ({ ...p, [s.id]: { ...r, guestCount: e.target.value } }))}
                            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                            placeholder="Nb personnes"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div>
                <label htmlFor="message" className="block text-sm font-semibold text-slate-800 mb-2">
                  Message (optionnel)
                </label>
                <textarea
                  id="message"
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ex : Merci pour l’invitation…"
                  className="w-full min-w-0 rounded-2xl border border-slate-200 px-4 py-3 text-base resize-none focus:border-teal-400 focus:ring-0"
                />
              </div>

              {submitError && <p className="text-sm text-red-600">{submitError}</p>}

              <button
                type="submit"
                disabled={confirmed === null || submitting}
                className="w-full py-3 rounded-2xl bg-teal-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Envoi…' : 'Envoyer ma réponse'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};


