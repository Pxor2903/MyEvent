import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Event as EventType, Guest, Organizer, Permission, SubEvent, User } from '@/core/types';
import { dbService } from '@/api';
import { GuestsTable } from '../GuestsTable';
import { EventMissionsTab } from '../EventMissionsTab';
import { EventDocumentsTab } from '../EventDocumentsTab';
import { EventBudgetPage } from '../EventBudgetPage';
import { EventManagementTab } from '../EventManagementTab';
import { GuestDetailModal } from '../GuestDetailModal';
import { Input } from '../Input';
import { V2ChatPanel } from './V2ChatPanel';
import { V2Card, V2SectionTitle, V2_PAGE_BG, v2BtnDanger, v2BtnPrimary, v2BtnSoft } from './ui';

type EventSection = 'overview' | 'gestion' | 'program' | 'guests' | 'chat' | 'budget';
type GestionPanel = 'summary' | 'documents' | 'access';

const Icon: React.FC<{ children: React.ReactNode; active?: boolean }> = ({ children, active }) => (
  <span className={`inline-flex items-center justify-center ${active ? 'text-teal-700' : 'text-slate-500'}`}>{children}</span>
);

export const EventV2: React.FC<{ user: User }> = ({ user }) => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeSection, setActiveSection] = useState<EventSection>('overview');
  const [gestionPanel, setGestionPanel] = useState<GestionPanel>('summary');

  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  // Modals: programme
  const [showSequenceModal, setShowSequenceModal] = useState(false);
  const [seqForm, setSeqForm] = useState({ title: '', date: '', location: '' });
  const [sequenceDeletingId, setSequenceDeletingId] = useState<string | null>(null);

  // Permission / équipe
  const persistEventAtomic = useCallback(
    async (updated: EventType) => {
      if (!eventId) return updated;
      const snapshot = event;
      setEvent(updated);
      try {
        const saved = await dbService.updateEventAtomic(eventId, () => updated);
        setEvent(saved);
        return saved;
      } catch (e) {
        console.error(e);
        setEvent(snapshot ?? updated);
        alert("Impossible de sauvegarder. Vérifie que les permissions et la migration sont correctes.");
        return snapshot ?? updated;
      }
    },
    [eventId, event]
  );

  const eventRef = useRef<EventType | null>(null);
  useEffect(() => {
    eventRef.current = event;
  }, [event]);

  const pendingGuestsUpdateRef = useRef<EventType | null>(null);
  const guestsTableUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushGuestsTableUpdate = useCallback(async () => {
    if (!eventId) return;
    const pending = pendingGuestsUpdateRef.current;
    if (!pending) return;
    pendingGuestsUpdateRef.current = null;
    try {
      const saved = await dbService.updateEventAtomic(eventId, () => pending);
      setEvent(saved);
    } catch (e) {
      console.error(e);
      setEvent(eventRef.current ?? pending);
      alert("Impossible d’enregistrer les invités.");
    }
  }, [eventId]);

  const handleGuestsTableUpdate = useCallback(
    (updated: EventType) => {
      pendingGuestsUpdateRef.current = updated;
      if (guestsTableUpdateTimeoutRef.current) clearTimeout(guestsTableUpdateTimeoutRef.current);
      guestsTableUpdateTimeoutRef.current = setTimeout(() => void flushGuestsTableUpdate(), 500);
    },
    [flushGuestsTableUpdate]
  );

  useEffect(() => {
    return () => {
      if (guestsTableUpdateTimeoutRef.current) clearTimeout(guestsTableUpdateTimeoutRef.current);
      void flushGuestsTableUpdate();
    };
  }, [flushGuestsTableUpdate]);

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
        const loaded = await dbService.findEventById(eventId);
        if (!cancelled) setEvent(loaded);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError("Impossible de charger l’événement.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const permissions = useMemo(() => {
    if (!event) return { isOwner: false, currentOrganizer: undefined, perms: [] as Permission[] };
    const isOwner = event.creatorId === user.id;
    const activeOrganizers = (event.organizers ?? []).filter((o) => o.status === 'confirmed');
    const currentOrganizer = activeOrganizers.find((o) => o.userId === user.id);
    const perms = currentOrganizer?.permissions ?? [];
    return { isOwner, currentOrganizer, perms };
  }, [event, user.id]);

  const hasPermission = useCallback(
    (perm: Permission) => permissions.isOwner || permissions.perms.includes(perm) || permissions.perms.includes('all'),
    [permissions]
  );

  const canManageProgram = hasPermission('manage_subevents');
  const canManageGuests = hasPermission('manage_guests');
  const canChat = hasPermission('access_organizer_chat');
  const canEditEvent = hasPermission('edit_details');
  const canViewBudget = hasPermission('view_budget');

  const teamMembers = useMemo(() => {
    if (!event) return [];
    return (event.organizers ?? [])
      .filter((o) => o.status === 'confirmed')
      .map((o) => ({
        userId: o.userId,
        label: `${o.firstName} ${o.lastName}`.trim()
      }));
  }, [event]);

  const navItems = useMemo(
    () =>
      [
        { id: 'overview' as const, label: 'Vue', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10h14V10" /></svg> },
        { id: 'gestion' as const, label: 'Gestion', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13.5m0-13.5l-3.5 3.5m3.5-3.5l3.5 3.5M5.5 21h13" /></svg> },
        { id: 'program' as const, label: 'Programme', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M4 11h16M6 21h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
        { id: 'guests' as const, label: 'Invités', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m12 0H9m1-10a4 4 0 10-8 0 4 4 0 008 0zM21 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg> },
        { id: 'chat' as const, label: 'Chat', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15a4 4 0 01-4 4H8l-5 5V7a4 4 0 014-4h10a4 4 0 014 4v8z" /></svg> },
        { id: 'budget' as const, label: 'Budget', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c0-2.21-1.79-4-4-4S4 5.79 4 8s1.79 4 4 4 4-1.79 4-4zm0 0h0m0 0c0 2.21 1.79 4 4 4s4-1.79 4-4-1.79-4-4-4-4 1.79-4 4zm0 0v0m-8 10h0m8 0h0" /></svg> }
      ] as const,
    []
  );

  const sortedSubEvents = useMemo(() => {
    const subs = (event?.subEvents ?? []) as SubEvent[];
    return [...subs].sort((a, b) => ((a.date ? new Date(a.date).getTime() : 0) - (b.date ? new Date(b.date).getTime() : 0)));
  }, [event]);

  const handleAddSequence = useCallback(async () => {
    if (!event || !eventId) return;
    if (!canManageProgram) return;
    if (!seqForm.title.trim()) return;

    const newSeq: SubEvent = {
      id: crypto.randomUUID(),
      title: seqForm.title.trim(),
      date: seqForm.date ? seqForm.date : undefined,
      location: seqForm.location ? seqForm.location : undefined,
      estimatedGuests: 0,
      keyMoments: []
    };

    const updated = await dbService.updateEventAtomic(eventId, (evt) => ({
      ...evt,
      subEvents: [...(evt.subEvents ?? []), newSeq]
    }));
    setEvent(updated);
    setShowSequenceModal(false);
    setSeqForm({ title: '', date: '', location: '' });
  }, [event, eventId, canManageProgram, seqForm]);

  const handleDeleteSequence = useCallback(
    async (subEventId: string) => {
      if (!event || !eventId) return;
      if (!canManageProgram) return;
      if (!window.confirm('Supprimer cette séquence ?')) return;
      setSequenceDeletingId(subEventId);
      try {
        const updated = await dbService.updateEventAtomic(eventId, (evt) => ({
          ...evt,
          subEvents: (evt.subEvents ?? []).filter((s) => s.id !== subEventId)
        }));
        setEvent(updated);
      } finally {
        setSequenceDeletingId(null);
      }
    },
    [event, eventId, canManageProgram]
  );

  if (loading || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-lg w-full">
          <h1 className="text-lg font-semibold text-slate-900">Événement introuvable</h1>
          <p className="text-sm text-slate-600 mt-2">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 w-full"
          >
            Retour au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  const canChatNow = canChat;

  return (
    <div className={`min-h-screen ${V2_PAGE_BG}`}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200"
        style={{ paddingTop: 'calc(1rem + var(--safe-area-top))' }}
      >
        <div className="page-container content-padding h-16 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="touch-target inline-flex items-center justify-center px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            aria-label="Retour"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 truncate">Event Master</p>
            <h1 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{event.title}</h1>
            <p className="text-xs text-slate-500 truncate">{event.isDateTBD ? 'À confirmer' : (event.startDate ? new Date(event.startDate).toLocaleDateString('fr-FR') : '—')} · {event.location || 'Lieu à définir'}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${canEditEvent ? 'border-teal-200 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-600'}`}>
              {canEditEvent ? 'Édition' : 'Lecture'}
            </span>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar desktop */}
        <aside className="hidden md:flex md:w-80 shrink-0 border-r border-slate-200 bg-white">
          <div className="flex flex-col h-[calc(100dvh-4rem)]">
            <div className="p-4 border-b border-slate-200">
              <div className="text-xs font-black uppercase tracking-widest text-slate-400">Navigation</div>
            </div>
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(item.id);
                    setGestionPanel('summary');
                  }}
                  className={`w-full inline-flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors ${
                    activeSection === item.id
                      ? 'bg-teal-50 border-teal-100 text-teal-900'
                      : 'bg-white border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <Icon active={activeSection === item.id}>{item.icon}</Icon>
                  <span className="text-sm font-semibold truncate">{item.label}</span>
                </button>
              ))}
              <div className="pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="w-full inline-flex items-center justify-center px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold"
                >
                  Retour
                </button>
              </div>
            </nav>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 p-3 sm:p-6 md:pb-10 overflow-hidden" style={{ paddingBottom: 'calc(5rem + var(--safe-area-bottom))' }}>
          <div className="h-full overflow-y-auto">
            {activeSection === 'overview' && (
              <section className="space-y-5">
                <V2Card className="p-5 sm:p-6">
                  <V2SectionTitle title="Description" />
                  <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{event.description || 'Aucune description.'}</p>
                </V2Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <V2Card className="p-5 lg:col-span-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Programme</h3>
                        <p className="text-xs text-slate-500 mt-1">Accède à chaque séquence (Timeline, Invités, Docs, Chat).</p>
                      </div>
                      {canManageProgram && (
                        <button type="button" onClick={() => setShowSequenceModal(true)} className={v2BtnPrimary}>
                          + Séquence
                        </button>
                      )}
                    </div>
                    <div className="mt-4 space-y-3">
                      {sortedSubEvents.length === 0 ? (
                        <p className="text-sm text-slate-500">Aucune séquence.</p>
                      ) : (
                        sortedSubEvents.map((sub) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => navigate(`/event/${event.id}/sub/${sub.id}`)}
                            className="w-full text-left rounded-2xl border border-slate-200 bg-slate-50 hover:bg-white p-4 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-slate-900 truncate">{sub.title || 'Sans titre'}</div>
                                <div className="text-xs text-slate-500 mt-1 truncate">
                                  {sub.date ? new Date(sub.date).toLocaleString('fr-FR', { dateStyle: 'medium' }) : 'Date TBD'} · {sub.location || 'Lieu à définir'}
                                </div>
                              </div>
                              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600 shrink-0">
                                {sub.keyMoments?.length ?? 0} jalon(s)
                              </span>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </V2Card>

                  <V2Card className="p-5">
                    <h3 className="text-base font-bold text-slate-900">Missions & équipe</h3>
                    <p className="text-xs text-slate-500 mt-1">Vue compacte. Pour gérer, va dans “Gestion”.</p>
                    <div className="mt-4">
                      <EventMissionsTab
                        event={event}
                        currentUserId={user.id}
                        canManage={hasPermission('manage_subevents')}
                        onUpdate={(updated) => void persistEventAtomic(updated)}
                        teamMembers={teamMembers}
                      />
                    </div>
                  </V2Card>
                </div>
              </section>
            )}

            {activeSection === 'gestion' && (
              <section className="space-y-5">
                <V2Card className="p-5 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <V2SectionTitle title="Gestion" subtitle="Missions, documents, accès & équipe." />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setGestionPanel('summary')} className={`px-3 py-2 rounded-2xl border text-sm font-semibold ${gestionPanel === 'summary' ? 'bg-teal-50 border-teal-100 text-teal-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>Aperçu</button>
                      <button type="button" onClick={() => setGestionPanel('documents')} className={`px-3 py-2 rounded-2xl border text-sm font-semibold ${gestionPanel === 'documents' ? 'bg-teal-50 border-teal-100 text-teal-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>Documents</button>
                      <button type="button" onClick={() => setGestionPanel('access')} className={`px-3 py-2 rounded-2xl border text-sm font-semibold ${gestionPanel === 'access' ? 'bg-teal-50 border-teal-100 text-teal-900' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>Accès</button>
                    </div>
                  </div>
                </V2Card>

                {gestionPanel === 'summary' && (
                  <EventManagementTab
                    event={event}
                    currentUser={user}
                    currentOrganizer={permissions.currentOrganizer}
                    permissions={permissions.perms}
                    isOwner={permissions.isOwner}
                    onUpdateEvent={(updated) => void persistEventAtomic(updated)}
                    onOpenDocuments={() => setGestionPanel('documents')}
                    onOpenTeamSettings={() => setGestionPanel('access')}
                  />
                )}

                {gestionPanel === 'documents' && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                    <EventDocumentsTab
                      event={event}
                      currentUserId={user.id}
                      subEventId={null}
                      subEvent={null}
                      canManage={permissions.isOwner || (permissions.currentOrganizer?.status === 'confirmed')}
                      guestsForSub={event.guests ?? []}
                    />
                  </div>
                )}

                {gestionPanel === 'access' && (
                  <V2Card className="p-4 sm:p-6">
                    <V2SectionTitle title="Accès & invitation" />
                    <p className="text-sm text-slate-600 mt-1">Informations d’accès + validation des demandes.</p>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                        <div className="text-xs font-black uppercase tracking-widest text-slate-400">Clé de partage</div>
                        <div className="font-mono text-sm text-slate-900 break-all mt-2">{event.shareCode}</div>
                      </div>
                      <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                        <div className="text-xs font-black uppercase tracking-widest text-slate-400">Mot de passe</div>
                        <div className="font-mono text-sm text-slate-900 break-all mt-2">{event.sharePassword ?? '—'}</div>
                      </div>
                    </div>

                    {/* Validation des demandes (owner only simplifié) */}
                    <div className="mt-6">
                      <h4 className="text-xs font-black uppercase tracking-widest text-amber-600">Demandes en attente</h4>
                      {(() => {
                        const pending = (event.organizers ?? []).filter((o) => o.status === 'pending');
                        if (pending.length === 0) return <p className="text-sm text-slate-500 mt-3">Aucune demande.</p>;
                        if (!permissions.isOwner) {
                          return <p className="text-sm text-slate-500 mt-3">Seul le propriétaire peut valider ces demandes.</p>;
                        }
                        return (
                          <div className="mt-3 space-y-3">
                            {pending.map((o) => (
                              <div key={o.userId} className="p-4 rounded-2xl border border-amber-100 bg-amber-50 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-bold text-amber-900 truncate">{o.firstName} {o.lastName}</div>
                                  <div className="text-xs text-amber-700 mt-1">Demande de co-organisation</div>
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => void persistEventAtomic({
                                      ...event,
                                      organizers: (event.organizers ?? []).filter((x) => x.userId !== o.userId)
                                    })}
                                    className={v2BtnSoft}
                                  >
                                    Refuser
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void persistEventAtomic({
                                      ...event,
                                      organizers: (event.organizers ?? []).map((x) =>
                                        x.userId === o.userId
                                          ? { ...x, status: 'confirmed', permissions: ['access_organizer_chat'], allowedSubEventIds: undefined }
                                          : x
                                      )
                                    })}
                                    className={v2BtnPrimary}
                                  >
                                    Approuver
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </V2Card>
                )}
              </section>
            )}

            {activeSection === 'program' && (
              <section className="space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <V2SectionTitle title="Programme" subtitle="Séquences du projet." />
                  {canManageProgram && (
                    <button type="button" onClick={() => setShowSequenceModal(true)} className={v2BtnPrimary}>
                      + Séquence
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {sortedSubEvents.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-center">
                      <p className="text-sm text-slate-500">Aucune séquence.</p>
                    </div>
                  ) : (
                    sortedSubEvents.map((sub) => {
                      const confirmedGuests = (event.guests ?? []).filter((g) => g.linkedSubEventIds.includes(sub.id) && g.status === 'confirmed').length;
                      return (
                        <div key={sub.id} className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <button type="button" className="w-full text-left" onClick={() => navigate(`/event/${event.id}/sub/${sub.id}`)}>
                                <div className="text-base font-bold text-slate-900 truncate">{sub.title || 'Sans titre'}</div>
                                <div className="text-xs text-slate-500 mt-1 truncate">
                                  {sub.date ? new Date(sub.date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Date TBD'} · {sub.location || 'Lieu à définir'}
                                </div>
                              </button>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700">
                                  {sub.keyMoments?.length ?? 0} jalon(s)
                                </span>
                                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-50 border border-teal-100 text-teal-800">
                                  {confirmedGuests} confirmé(s)
                                </span>
                              </div>
                            </div>
                            {canManageProgram && permissions.isOwner && (
                              <button
                                type="button"
                                disabled={sequenceDeletingId === sub.id}
                                onClick={() => void handleDeleteSequence(sub.id)}
                                className={`shrink-0 ${v2BtnDanger} text-xs px-3 py-2`}
                              >
                                {sequenceDeletingId === sub.id ? '…' : 'Supprimer'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            )}

            {activeSection === 'guests' && (
              <section className="space-y-4">
                <h2 className="text-lg font-black text-slate-900">Invités</h2>
                <GuestsTable
                  event={event}
                  filterSubEventId={null}
                  canManage={canManageGuests}
                  currentUserId={user.id}
                  onUpdate={handleGuestsTableUpdate}
                  onGuestClick={(g) => setSelectedGuest(g)}
                />
              </section>
            )}

            {activeSection === 'chat' && (
              <section className="h-[calc(100dvh-12rem)] min-h-[520px]">
                <V2ChatPanel
                  eventId={event.id}
                  channelId="global"
                  user={user}
                  role={permissions.isOwner ? 'owner' : 'organizer'}
                  canSend={canChatNow}
                />
              </section>
            )}

            {activeSection === 'budget' && canViewBudget && (
              <section className="space-y-4">
                <h2 className="text-lg font-black text-slate-900">Budget</h2>
                <EventBudgetPage
                  event={event}
                  canEdit={canEditEvent}
                  onUpdate={(updated) => setEvent(updated)}
                  onSaveBudget={async (amount, currency, subEventBudgets) => {
                    await dbService.updateEventAtomic(event.id, (evt) => ({
                      ...evt,
                      budget: amount,
                      currency,
                      subEventBudgets
                    }));
                    const fresh = await dbService.findEventById(event.id);
                    setEvent(fresh);
                  }}
                  onSaveGlobalAllocations={async (allocations) => {
                    await dbService.updateEventAtomic(event.id, (evt) => ({
                      ...evt,
                      globalBudgetAllocations: allocations
                    }));
                    const fresh = await dbService.findEventById(event.id);
                    setEvent(fresh);
                  }}
                />
              </section>
            )}
          </div>
        </main>
      </div>

      {/* Bottom nav mobile */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/90 backdrop-blur" style={{ paddingBottom: 'calc(1rem + var(--safe-area-bottom))' }}>
        <div className="flex items-center justify-between px-2 py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setActiveSection(item.id);
                setGestionPanel('summary');
              }}
              className={`flex-1 inline-flex flex-col items-center justify-center gap-1 py-2 rounded-xl ${
                activeSection === item.id ? 'text-teal-700' : 'text-slate-500'
              }`}
            >
              {React.cloneElement(item.icon as any, { className: 'w-5 h-5' })}
              <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sequence modal */}
      {showSequenceModal && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-3">
              <h3 className="text-base font-black text-slate-900">Ajouter une séquence</h3>
              <button type="button" onClick={() => setShowSequenceModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <Input label="Titre" value={seqForm.title} onChange={(e) => setSeqForm((p) => ({ ...p, title: e.target.value }))} placeholder="Ex: Cérémonie / Cocktail" />
              <Input label="Date (optionnel)" type="datetime-local" value={seqForm.date} onChange={(e) => setSeqForm((p) => ({ ...p, date: e.target.value }))} />
              <Input label="Lieu (optionnel)" value={seqForm.location} onChange={(e) => setSeqForm((p) => ({ ...p, location: e.target.value }))} placeholder="Ex: Salle principale" />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowSequenceModal(false)} className="flex-1 py-3 rounded-2xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50">
                  Annuler
                </button>
                <button type="button" onClick={() => void handleAddSequence()} disabled={!canManageProgram || !seqForm.title.trim()} className="flex-[2] py-3 rounded-2xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed">
                  Créer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guest detail modal (via GuestsTable onGuestClick) */}
      {selectedGuest && (
        <GuestDetailModal
          guest={selectedGuest}
          event={event}
          currentUserId={user.id}
          onClose={() => setSelectedGuest(null)}
          onSave={(updated) => {
            void persistEventAtomic(updated).then(() => setSelectedGuest(null));
          }}
        />
      )}
    </div>
  );
};

