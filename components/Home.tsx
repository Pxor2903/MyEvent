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
      setJoinError('Saisis la clé de partage et le mot de passe.');
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
    alert("Demande envoyée ! Le créateur doit vous approuver dans l’onglet Équipe de l’événement.");
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
    <div className="space-y-12 animate-in fade-in duration-500">
      {tbdEvents.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            Projets en cours <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{tbdEvents.length}</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tbdEvents.map(e => (
              <button key={e.id} type="button" onClick={() => { setSelectedId(e.id); setView('event-detail'); }} className="text-left rounded-xl overflow-hidden hover:shadow-md transition-shadow">
                <EventCard event={e} />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          À venir <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">{upcomingEvents.length}</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {upcomingEvents.map(e => (
            <button key={e.id} type="button" onClick={() => { setSelectedId(e.id); setView('event-detail'); }} className="text-left rounded-xl overflow-hidden hover:shadow-md transition-shadow">
              <EventCard event={e} />
            </button>
          ))}
          {upcomingEvents.length === 0 && tbdEvents.length === 0 && (
            <div className="py-12 sm:py-16 bg-gray-50/80 border border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-500">
               <p className="text-sm font-medium mb-4 text-center px-4">Aucun projet pour le moment.</p>
               <div className="flex gap-3">
                 <button type="button" onClick={() => setView('create-event')} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">Créer un projet</button>
                 <button type="button" onClick={() => setShowJoinModal(true)} className="px-4 py-2 border border-gray-300 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50">Rejoindre un projet</button>
               </div>
            </div>
          )}
        </div>
      </section>

      {pastEvents.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-gray-100">
          <h2 className="text-lg font-semibold text-gray-500">Historique</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastEvents.map(e => (
              <button key={e.id} type="button" onClick={() => { setSelectedId(e.id); setView('event-detail'); }} className="text-left rounded-xl overflow-hidden opacity-75 hover:opacity-90 hover:shadow-md transition-all">
                <EventCard event={e} />
              </button>
            ))}
          </div>
        </section>
      )}

      {showJoinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/80 backdrop-blur-md animate-in fade-in">
           <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 space-y-6 shadow-2xl animate-in zoom-in-95">
              <h3 className="text-xl font-black">Rejoindre un projet</h3>
              <p className="text-xs text-gray-500">Saisis la clé de partage et le mot de passe reçus par invitation.</p>
              <div className="space-y-4">
                 <Input label="Clé de partage" placeholder="Ex: ABC12XYZ34" value={joinData.code} onChange={e => setJoinData({...joinData, code: e.target.value.toUpperCase()})} />
                 <Input label="Mot de passe" placeholder="Ex: ABCD1234" type="text" autoComplete="off" value={joinData.password} onChange={e => setJoinData({...joinData, password: e.target.value})} />
                 <button type="button" onClick={handlePasteInvitation} className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 text-xs font-bold uppercase hover:border-indigo-300 hover:text-indigo-600 transition-colors">
                   Coller l'invitation
                 </button>
                 {joinError && <p className="text-[10px] font-black text-red-500 uppercase">{joinError}</p>}
              </div>
              <div className="flex gap-2">
                 <button onClick={() => setShowJoinModal(false)} className="flex-1 py-4 font-bold text-gray-400 text-xs uppercase">Annuler</button>
                 <button onClick={handleJoin} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl shadow-indigo-100">Envoyer demande</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFDFF] flex flex-col">
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50" aria-label="Navigation principale">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex justify-between items-center">
          <button type="button" onClick={() => setView('dashboard')} aria-label="Retour à l'accueil myEvent" className="focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg"><Logo /></button>
          <div className="flex items-center gap-2 sm:gap-4">
             <span className="hidden sm:inline text-sm font-medium text-gray-700">Bonjour, {user.firstName}</span>
             <img src={`https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=6366f1&color=fff&bold=true`} className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 border-gray-100 shadow-sm" alt={`Avatar de ${user.firstName} ${user.lastName}`}/>
             <button type="button" onClick={onLogout} className="p-2.5 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" aria-label="Déconnexion"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7"/></svg></button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {view === 'dashboard' && (
          <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 mb-8 sm:mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Vos Événements</h1>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button type="button" onClick={() => setShowJoinModal(true)} className="px-4 py-3 sm:px-5 sm:py-3.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-colors">
                Rejoindre un projet
              </button>
              <button type="button" onClick={() => setView('create-event')} className="px-5 py-3 sm:px-6 sm:py-3.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                Nouveau projet
              </button>
            </div>
          </header>
        )}

        {view === 'create-event' ? (
          <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 md:p-10 rounded-2xl border border-gray-100 shadow-lg">
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
            <div className="bg-white p-10 rounded-[3rem] border border-gray-100 text-center text-gray-400">
              Événement introuvable. Retour au tableau de bord.
            </div>
          )
        ) : renderDashboard()}
      </main>
      <Footer onNavigate={setView} />
    </div>
  );
};
