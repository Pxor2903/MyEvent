import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Event as EventType, User } from '@/core/types';
import { dbService } from '@/api';
import { EventDetail } from '../EventDetail';

type SubSection = 'sequence' | 'guests' | 'budget' | 'documents' | 'chat';

const Icon: React.FC<{ active?: boolean; children: React.ReactNode }> = ({ active, children }) => (
  <span className={`inline-flex items-center justify-center ${active ? 'text-teal-600' : 'text-slate-500'}`}>{children}</span>
);

export const SubEventV2: React.FC<{ user: User }> = ({ user }) => {
  const { eventId, subEventId } = useParams<{ eventId: string; subEventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSubSection, setActiveSubSection] = useState<SubSection>('sequence');

  const refreshEvent = async (id: string) => {
    const fresh = await dbService.findEventById(id);
    setEvent(fresh);
    return fresh;
  };

  useEffect(() => {
    if (!eventId) {
      setError('Identifiant d’événement manquant.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const fresh = await dbService.findEventById(eventId);
        if (!cancelled) setEvent(fresh);
      } catch (e) {
        if (!cancelled) setError("Impossible de charger l’événement.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const navItems = useMemo(
    () =>
      [
        { id: 'sequence' as const, label: 'Timeline', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M4 11h16M6 21h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
        { id: 'guests' as const, label: 'Invités', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m12 0H9m1-10a4 4 0 10-8 0 4 4 0 008 0zM21 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg> },
        { id: 'budget' as const, label: 'Budget', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c0-2.21-1.79-4-4-4S4 5.79 4 8s1.79 4 4 4 4-1.79 4-4zm0 0h0m0 0c0 2.21 1.79 4 4 4s4-1.79 4-4-1.79-4-4-4-4 1.79-4 4zm0 0v0" /></svg> },
        { id: 'documents' as const, label: 'Docs', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V5a2 2 0 012-2h8l6 6v12a2 2 0 01-2 2z" /></svg> },
        { id: 'chat' as const, label: 'Chat', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15a4 4 0 01-4 4H8l-5 5V7a4 4 0 014-4h10a4 4 0 014 4v8z" /></svg> }
      ] as const,
    []
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !event || !subEventId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-lg w-full">
          <h1 className="text-lg font-semibold text-slate-900">Séquence introuvable</h1>
          <p className="text-sm text-slate-600 mt-2">{error || 'Réessaie plus tard.'}</p>
          <button
            type="button"
            onClick={() => navigate(`/event/${eventId ?? ''}`)}
            className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 w-full"
            disabled={!eventId}
          >
            Retour à l’événement
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="hidden md:flex md:w-72 shrink-0 border-r border-slate-200 bg-white">
        <div className="flex flex-col w-full">
          <div className="px-5 py-4 border-b border-slate-200">
            <div className="text-xs font-black uppercase tracking-widest text-slate-400">Event</div>
            <div className="mt-1 text-base font-semibold text-slate-900 truncate">{event.title}</div>
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSubSection(item.id)}
                className={`w-full inline-flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-colors ${
                  activeSubSection === item.id
                    ? 'bg-teal-50 text-teal-800 border border-teal-100'
                    : 'bg-transparent text-slate-700 hover:bg-slate-50 border border-transparent hover:border-slate-200'
                }`}
              >
                <Icon active={activeSubSection === item.id}>{item.icon}</Icon>
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="px-3 pb-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => navigate(`/event/${event.id}`)}
              className="w-full inline-flex items-center justify-center px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold"
            >
              Retour
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex items-center justify-between px-2 py-2 overflow-x-auto no-scrollbar gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSubSection(item.id)}
                className={`flex-1 inline-flex flex-col items-center justify-center gap-1 py-2 rounded-xl ${
                  activeSubSection === item.id ? 'text-teal-700' : 'text-slate-500'
                }`}
              >
                {React.cloneElement(item.icon as any, { className: 'w-5 h-5' })}
                <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="h-full pb-24 md:pb-10 p-3 sm:p-6 overflow-hidden">
          <EventDetail
            event={event}
            user={user}
            initialSubEventId={subEventId}
            variant="v2"
            subTabOverride={activeSubSection}
            onBack={() => navigate(`/event/${eventId}`)}
            onBackToEvent={() => navigate(`/event/${eventId}`)}
            onUpdate={(updated) => {
              if (!updated) {
                navigate('/');
                return;
              }
              setEvent(updated);
            }}
            onRefreshEvent={(id) => refreshEvent(id)}
          />
        </div>
      </div>
    </div>
  );
};

