import React, { useState } from 'react';
import { User, Event, HomeView } from '@/core/types';
import { Logo } from '@/core/constants';
import { dbService } from '@/api';
import { useEvents } from '@/hooks/useEvents';
import { generateSharePassword } from '@/utils/sharePassword';
import { EventCard } from './EventCard';
import { Footer } from './Footer';
import { EventForm } from './EventForm';
import { EventDetail } from './EventDetail';
import { Input } from './Input';

interface HomeProps {
  user: User;
  onLogout: () => void;
}

export const Home: React.FC<HomeProps> = ({ user, onLogout }) => {
  const [view, setView] = useState<HomeView>('dashboard');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { events, loading, fetchEvents, setEvents } = useEvents(user.id);

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinData, setJoinData] = useState({ code: '', password: '' });
  const [joinError, setJoinError] = useState('');

  const handleCreate = async (data: any) => {
    try {
      const shareCode = await dbService.generateUniqueShareCode();
      const sharePassword = generateSharePassword();
      const newEvent: Event = {
        ...data,
        id: crypto.randomUUID(),
        shareCode,
        sharePassword,
        isGuestChatEnabled: true,
        organizers: []
      };
      await dbService.saveEvent(newEvent);
      setView('dashboard');
    } catch (error: any) {
      console.error('Event creation failed', error);
      alert("Impossible de créer l'événement pour le moment. Réessaie.");
    }
  };

  const handleJoin = async () => {
    setJoinError('');
    const code = joinData.code.trim();
    const password = joinData.password.trim();
    if (!code || !password) {
      setJoinError('Saisis la clé et le mot de passe.');
      return;
    }
    const result = await dbService.requestJoinByCodeAndPassword(code, password, user);
    if (!result.success) {
      setJoinError(result.error || 'Clé ou mot de passe incorrect.');
      return;
    }
    setShowJoinModal(false);
    setJoinData({ code: '', password: '' });
    fetchEvents();
    alert("Demande envoyée. Le créateur doit vous approuver dans l’onglet Équipe.");
  };

  const handlePasteInvitation = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const lines = text.split(/\r?\n/).map(l => l.trim());
      let code = '';
      let password = '';
      for (const line of lines) {
        const keyMatch = line.match(/Clé\s*(?:de partage)?\s*[:\-]\s*(.+)/i);
        if (keyMatch) code = keyMatch[1].trim();
        const pwdMatch = line.match(/Mot\s*de\s*passe\s*[:\-]\s*(.+)/i);
        if (pwdMatch) password = pwdMatch[1].trim();
      }
      if (code || password) {
        setJoinData(prev => ({ ...prev, code: code || prev.code, password: password || prev.password }));
        setJoinError('');
      }
    } catch {
      setJoinError('Impossible de lire le presse-papier.');
    }
  };

  const selectedEvent = events.find(e => e.id === selectedId);
  const now = new Date();
  const tbdEvents = events.filter(e => e.isDateTBD);
  const upcomingEvents = events.filter(e => !e.isDateTBD && new Date(e.startDate!) >= now);
  const pastEvents = events.filter(e => !e.isDateTBD && new Date(e.startDate!) < now);

  const renderDashboard = () => (
    <div className="space-y-10">
      {tbdEvents.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">En cours</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tbdEvents.map(e => (
              <button key={e.id} type="button" onClick={() => { setSelectedId(e.id); setView('event-detail'); }} className="text-left rounded-2xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                <EventCard event={e} />
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">À venir</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcomingEvents.map(e => (
            <button key={e.id} type="button" onClick={() => { setSelectedId(e.id); setView('event-detail'); }} className="text-left rounded-2xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
              <EventCard event={e} />
            </button>
          ))}
          {upcomingEvents.length === 0 && tbdEvents.length === 0 && (
            <div className="col-span-full py-16 rounded-2xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center text-slate-500 px-4">
              <p className="text-sm font-medium text-slate-600 mb-1">Aucun événement</p>
              <p className="text-sm mb-6">Créez-en un ou rejoignez-en un avec une invitation.</p>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button type="button" onClick={() => setView('create-event')} className="min-h-[48px] px-5 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 active:bg-indigo-800">
                  Créer un événement
                </button>
                <button type="button" onClick={() => setShowJoinModal(true)} className="min-h-[48px] px-5 py-3 border-2 border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50">
                  Rejoindre avec une clé
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {pastEvents.length > 0 && (
        <section className="pt-8 border-t border-slate-200">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Passés</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastEvents.map(e => (
              <button key={e.id} type="button" onClick={() => { setSelectedId(e.id); setView('event-detail'); }} className="text-left rounded-2xl overflow-hidden opacity-90 hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2">
                <EventCard event={e} />
              </button>
            ))}
          </div>
        </section>
      )}

      {showJoinModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="join-title">
          <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl p-5 sm:p-6 space-y-4 pb-[env(safe-area-inset-bottom)] sm:pb-6">
            <h3 id="join-title" className="text-lg font-semibold text-slate-900">Rejoindre un événement</h3>
            <p className="text-sm text-slate-500">Clé et mot de passe reçus par invitation.</p>
            <Input label="Clé" placeholder="Ex: ABC12XYZ34" value={joinData.code} onChange={e => setJoinData({ ...joinData, code: e.target.value.toUpperCase() })} />
            <Input label="Mot de passe" placeholder="Ex: ABCD1234" type="text" autoComplete="off" value={joinData.password} onChange={e => setJoinData({ ...joinData, password: e.target.value })} />
            <button type="button" onClick={handlePasteInvitation} className="w-full py-2.5 rounded-xl border border-dashed border-slate-200 text-slate-500 text-sm hover:border-indigo-300 hover:text-indigo-600">
              Coller l'invitation
            </button>
            {joinError && <p className="text-sm text-red-600">{joinError}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowJoinModal(false)} className="flex-1 py-2.5 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-100">Annuler</button>
              <button type="button" onClick={handleJoin} className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700">Rejoindre</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 pt-[env(safe-area-inset-top)]" aria-label="Navigation">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 h-14 min-h-[56px] flex justify-between items-center">
          <button type="button" onClick={() => setView('dashboard')} className="min-w-[44px] min-h-[44px] flex items-center justify-center -m-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg" aria-label="Accueil">
            <Logo />
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-sm text-slate-600 hidden sm:inline truncate max-w-[120px]">Bonjour, {user.firstName}</span>
            <img src={`https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=6366f1&color=fff`} className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg shrink-0" alt="" />
            <button type="button" onClick={onLogout} className="min-w-[44px] min-h-[44px] p-2 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50" aria-label="Déconnexion">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-4xl w-full mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 min-h-0">
        {view === 'dashboard' && (
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">Vos événements</h1>
            <div className="flex gap-2 flex-shrink-0">
              <button type="button" onClick={() => setShowJoinModal(true)} className="min-h-[44px] px-4 py-2.5 border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 active:bg-slate-100">
                Rejoindre
              </button>
              <button type="button" onClick={() => setView('create-event')} className="min-h-[44px] px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 active:bg-indigo-800 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                Nouveau
              </button>
            </div>
          </header>
        )}

        {view === 'create-event' ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 md:p-8 max-w-2xl mx-auto">
            <EventForm user={user} onCancel={() => setView('dashboard')} onSubmit={handleCreate} />
          </div>
        ) : view === 'event-detail' ? (
          selectedEvent ? (
            <EventDetail
              event={selectedEvent}
              user={user}
              onBack={() => setView('dashboard')}
              onUpdate={(updated) => {
                if (updated) setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
                fetchEvents();
              }}
            />
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
              Événement introuvable.
            </div>
          )
        ) : renderDashboard()}
      </main>
      <Footer onNavigate={setView} />
    </div>
  );
};

