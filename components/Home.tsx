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
        <section className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Projets en cours</h2>
            <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">{tbdEvents.length}</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tbdEvents.map(e => (
              <button key={e.id} onClick={() => { setSelectedId(e.id); setView('event-detail'); }} className="text-left hover:scale-[1.02] transition-transform">
                <EventCard event={e} />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">À venir</h2>
          <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">{upcomingEvents.length}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {upcomingEvents.map(e => (
            <button key={e.id} onClick={() => { setSelectedId(e.id); setView('event-detail'); }} className="text-left hover:scale-[1.02] transition-transform">
              <EventCard event={e} />
            </button>
          ))}
          {upcomingEvents.length === 0 && tbdEvents.length === 0 && (
            <div className="col-span-full py-20 bg-gray-50 border-2 border-dashed border-gray-100 rounded-[3rem] flex flex-col items-center justify-center text-gray-300">
               <p className="font-bold italic mb-4 text-center px-6">Aucun événement à l'horizon.</p>
               <div className="flex gap-4">
                 <button onClick={() => setView('create-event')} className="text-indigo-600 font-black uppercase text-[10px] tracking-widest">+ Créer</button>
                 <button onClick={() => setShowJoinModal(true)} className="text-indigo-400 font-black uppercase text-[10px] tracking-widest underline">Rejoindre</button>
               </div>
            </div>
          )}
        </div>
      </section>

      {pastEvents.length > 0 && (
        <section className="space-y-6 opacity-60">
          <h2 className="text-xl font-black text-gray-400 tracking-tight px-2">Historique</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pastEvents.map(e => (
              <button key={e.id} onClick={() => { setSelectedId(e.id); setView('event-detail'); }} className="text-left grayscale">
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
      <nav className="bg-white/80 backdrop-blur-2xl border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex justify-between items-center">
          <button onClick={() => setView('dashboard')}><Logo /></button>
          <div className="flex items-center gap-4">
             <div className="hidden sm:block text-right">
                <p className="text-xs font-black text-gray-900">{user.firstName}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">ID: {user.id}</p>
             </div>
             <img src={`https://ui-avatars.com/api/?name=${user.firstName}+${user.lastName}&background=6366f1&color=fff&bold=true`} className="w-10 h-10 rounded-2xl border-2 border-white shadow-sm" alt="U"/>
             <button onClick={onLogout} className="p-3 text-gray-300 hover:text-red-500 transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7"/></svg></button>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10">
        {view === 'dashboard' && (
          <header className="flex flex-col sm:flex-row sm:items-center justify-between mb-12 gap-6">
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Votre Console</h1>
            <div className="flex gap-3">
              <button onClick={() => setShowJoinModal(true)} className="px-6 py-5 bg-white border-2 border-gray-100 text-gray-500 rounded-[2rem] font-black text-[11px] uppercase tracking-widest hover:bg-gray-50 transition-all">
                Rejoindre
              </button>
              <button onClick={() => setView('create-event')} className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-indigo-100 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>
                Nouveau Projet
              </button>
            </div>
          </header>
        )}

        {view === 'create-event' ? (
          <div className="max-w-4xl mx-auto bg-white p-12 rounded-[4rem] border border-gray-100 shadow-2xl">
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
