import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { User } from '@/core/types';
import { useGuestEvents } from '@/hooks/useGuestEvents';
import { V2ChatPanel } from './V2ChatPanel';
import { V2Card, V2SectionTitle, V2_PAGE_BG } from './ui';

export const GuestEventV2: React.FC<{ user: User }> = ({ user }) => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { events, loading } = useGuestEvents(user);
  const event = useMemo(() => events.find((e) => e.id === eventId) ?? null, [events, eventId]);
  const [channelId, setChannelId] = useState<string>('global');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className={`min-h-screen ${V2_PAGE_BG} p-6 flex items-center justify-center`}>
        <V2Card className="p-6 max-w-lg w-full">
          <h1 className="text-lg font-semibold text-slate-900">Événement invité introuvable</h1>
          <p className="text-sm text-slate-600 mt-2">Tu n’es pas (ou plus) invité à cet événement.</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-4 px-4 py-2.5 rounded-2xl bg-slate-900 text-white text-sm font-semibold"
          >
            Retour
          </button>
        </V2Card>
      </div>
    );
  }

  const channels = [{ id: 'global', label: event.title }, ...(event.subEvents ?? []).map((s) => ({ id: s.id, label: s.title || 'Séquence' }))];

  return (
    <div className={`min-h-screen ${V2_PAGE_BG}`}>
      <header
        className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200"
        style={{ paddingTop: 'calc(1rem + var(--safe-area-top))' }}
      >
        <div className="page-container content-padding h-16 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">Espace invité</p>
            <h1 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{event.title}</h1>
          </div>
        </div>
      </header>

      <main className="page-container content-padding py-6 space-y-5" style={{ paddingBottom: 'calc(5rem + var(--safe-area-bottom))' }}>
        <V2Card className="p-5">
          <V2SectionTitle
            title="Informations"
            subtitle={`${event.isDateTBD ? 'Date à confirmer' : (event.startDate ? new Date(event.startDate).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—')} · ${event.location || 'Lieu à définir'}`}
          />
          <p className="mt-3 text-sm text-slate-600 whitespace-pre-wrap">{event.description || 'Aucune description fournie.'}</p>
        </V2Card>

        <V2Card className="p-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <V2SectionTitle title="Chats" subtitle="Global et sous-événements" />
            <select
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm bg-white"
            >
              {channels.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="mt-4 h-[520px]">
            <V2ChatPanel eventId={event.id} channelId={channelId} user={user} role="guest" canSend={true} />
          </div>
        </V2Card>
      </main>
    </div>
  );
};

