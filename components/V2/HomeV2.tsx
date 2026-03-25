import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User, HomeView } from '@/core/types';
import { Logo } from '@/core/constants';
import { dbService } from '@/api';
import { useEvents } from '@/hooks/useEvents';
import { generateSharePassword } from '@/utils/sharePassword';
import { EventCard } from '../EventCard';
import { Footer } from '../Footer';
import { EventForm } from '../EventForm';
import { useAsyncAction } from './useAsyncAction';

type UiMode = 'v1' | 'v2';

function getUiMode(): UiMode {
  if (typeof window === 'undefined') return 'v1';
  const v = window.localStorage.getItem('uiMode');
  return v === 'v2' ? 'v2' : 'v1';
}

export const HomeV2: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const [uiMode, setUiMode] = useState<UiMode>(getUiMode());
  const [view, setView] = useState<HomeView>('dashboard');
  const navigate = useNavigate();
  const { events, fetchEvents } = useEvents(user.id);

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinData, setJoinData] = useState({ code: '', password: '' });
  const [joinError, setJoinError] = useState('');
  const { pending: creatingEvent, run: runCreate } = useAsyncAction();
  const { pending: joiningEvent, run: runJoin } = useAsyncAction();

  const toggleUiMode = () => {
    const next: UiMode = uiMode === 'v2' ? 'v1' : 'v2';
    setUiMode(next);
    window.localStorage.setItem('uiMode', next);
    window.dispatchEvent(new Event('uiModeChanged'));
  };

  const handleCreate = async (data: any) => {
    await runCreate(async () => {
      const shareCode = await dbService.generateUniqueShareCode();
      const sharePassword = generateSharePassword();
      const newEvent = {
        ...data,
        id: crypto.randomUUID(),
        shareCode,
        sharePassword,
        isGuestChatEnabled: true,
        organizers: [],
        missions: []
      } as any;
      await dbService.saveEvent(newEvent);
      fetchEvents();
      navigate(`/event/${newEvent.id}`);
    }).catch((e) => {
      console.error(e);
      alert("Impossible de créer l'événement pour le moment. Réessaie.");
    });
  };

  const handleJoin = async () => {
    setJoinError('');
    const code = joinData.code.trim();
    const password = joinData.password.trim();
    if (!code || !password) {
      setJoinError('Saisis la clé et le mot de passe.');
      return;
    }
    await runJoin(async () => {
      const result = await dbService.requestJoinByCodeAndPassword(code, password, user);
      if (!result.success) {
        setJoinError(result.error || 'Clé ou mot de passe incorrect.');
        return;
      }
      setShowJoinModal(false);
      setJoinData({ code: '', password: '' });
      fetchEvents();
      alert("Demande envoyée. Le créateur doit vous approuver dans l’onglet Équipe.");
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-container content-padding py-4 flex items-center justify-between gap-3 border-b border-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          <Logo />
          <div className="min-w-0">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Event Master</p>
            <h1 className="text-lg font-semibold text-slate-900 truncate">Tableau de bord</h1>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleUiMode}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50"
          title="Basculer l’interface"
        >
          {uiMode === 'v2' ? 'UI V2' : 'UI V1'}
        </button>
      </div>

      <main className="page-container content-padding py-6 pb-20">
        {view === 'create-event' ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 max-w-2xl mx-auto w-full min-w-0">
            <EventForm user={user} onCancel={() => setView('dashboard')} onSubmit={handleCreate} submitting={creatingEvent} />
          </div>
        ) : (
          <>
            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Vos événements</h2>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setView('create-event')}
                    className="min-h-[44px] px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700"
                  >
                    + Créer
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowJoinModal(true)}
                    className="min-h-[44px] px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50"
                  >
                    Rejoindre
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => {
                      navigate(`/event/${e.id}`);
                    }}
                    className="text-left rounded-2xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                  >
                    <EventCard event={e} />
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <Footer onNavigate={() => {}} />
      {/* TODO: réutiliser le modal join complet depuis Home.tsx (ici simplifié). */}
      {showJoinModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-gray-900/70" onClick={() => setShowJoinModal(false)}>
          <div className="bg-white w-full max-w-md rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900">Rejoindre</h3>
            <div className="mt-3 space-y-3">
              <input
                className="w-full px-4 py-2 rounded-xl border border-slate-200"
                placeholder="Clé"
                value={joinData.code}
                onChange={(e) => setJoinData((p) => ({ ...p, code: e.target.value }))}
              />
              <input
                className="w-full px-4 py-2 rounded-xl border border-slate-200"
                placeholder="Mot de passe"
                type="password"
                value={joinData.password}
                onChange={(e) => setJoinData((p) => ({ ...p, password: e.target.value }))}
              />
              {joinError && <p className="text-sm text-red-600">{joinError}</p>}
              <button
                type="button"
                onClick={handleJoin}
                disabled={joiningEvent}
                className="w-full px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {joiningEvent ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

