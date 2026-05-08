import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Event as EventType, Guest, KeyMoment, Permission, SubEvent, User } from '@/core/types';
import { dbService } from '@/api';
import { GuestsTable } from '../GuestsTable';
import { EventDocumentsTab } from '../EventDocumentsTab';
import { GuestDetailModal } from '../GuestDetailModal';
import { SubEventBudgetPage } from '../SubEventBudgetPage';
import { Input } from '../Input';
import { V2ChatPanel } from './V2ChatPanel';
import { V2Card, V2SectionTitle, V2_PAGE_BG, v2BtnDanger, v2BtnPrimary, v2BtnSoft } from './ui';

type SubSection = 'sequence' | 'guests' | 'documents' | 'chat' | 'budget';

const Icon: React.FC<{ children: React.ReactNode; active?: boolean }> = ({ children, active }) => (
  <span className={`inline-flex items-center justify-center ${active ? 'text-teal-700' : 'text-slate-500'}`}>{children}</span>
);

export const SubEventV2New: React.FC<{ user: User }> = ({ user }) => {
  const { eventId, subEventId } = useParams<{ eventId: string; subEventId: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<EventType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeSubSection, setActiveSubSection] = useState<SubSection>('sequence');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);

  // Modals: sequence settings + key moments
  const [showSequenceEditModal, setShowSequenceEditModal] = useState(false);
  const [subEditForm, setSubEditForm] = useState({ title: '', date: '', location: '' });

  const [showMomentModal, setShowMomentModal] = useState(false);
  const [momentForm, setMomentForm] = useState({ time: '', label: '' });
  const [momentSaving, setMomentSaving] = useState(false);
  const [sequenceDeletingId, setSequenceDeletingId] = useState<string | null>(null);

  // Load event
  useEffect(() => {
    if (!eventId || !subEventId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const fresh = await dbService.findEventById(eventId);
        if (!cancelled) setEvent(fresh);
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
  }, [eventId, subEventId]);

  const currentSub: SubEvent | null = useMemo(() => {
    if (!event || !subEventId) return null;
    return (event.subEvents ?? []).find((s) => s.id === subEventId) ?? null;
  }, [event, subEventId]);

  const permissions = useMemo(() => {
    if (!event) {
      return {
        isOwner: false,
        currentOrganizer: undefined as any,
        perms: [] as Permission[],
        allowedSubIds: [] as string[]
      };
    }
    const isOwner = event.creatorId === user.id;
    const activeOrganizers = (event.organizers ?? []).filter((o) => o.status === 'confirmed');
    const currentOrganizer = activeOrganizers.find((o) => o.userId === user.id);
    const perms = currentOrganizer?.permissions ?? [];
    const allowedSubIds = currentOrganizer?.allowedSubEventIds ?? [];
    return { isOwner, currentOrganizer, perms, allowedSubIds };
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

  const canManageSubEvent = useCallback(
    (subId: string) => !permissions.allowedSubIds?.length || permissions.allowedSubIds.includes(subId),
    [permissions.allowedSubIds]
  );

  const canManageSubProgramHere = !!subEventId && canManageProgram && canManageSubEvent(subEventId);
  const canManageGuestsHere = !!subEventId && canManageGuests && canManageSubEvent(subEventId);
  const canChatHere = !!subEventId && (permissions.isOwner || (canChat && canManageSubEvent(subEventId)));
  const canManageDocs = permissions.isOwner || !!permissions.currentOrganizer;

  const teamGuestsForSub = useMemo(() => {
    if (!event || !subEventId) return [];
    return (event.guests ?? []).filter((g) => g.linkedSubEventIds.includes(subEventId));
  }, [event, subEventId]);

  // Persist helper
  const eventRef = useRef<EventType | null>(null);
  useEffect(() => {
    eventRef.current = event;
  }, [event]);

  const persistEventAtomic = useCallback(
    async (updated: EventType) => {
      if (!eventId) return updated;
      const snapshot = eventRef.current;
      setEvent(updated);
      try {
        const saved = await dbService.updateEventAtomic(eventId, () => updated);
        setEvent(saved);
        return saved;
      } catch (e) {
        console.error(e);
        setEvent(snapshot ?? updated);
        alert("Impossible de sauvegarder. Vérifie les permissions et la migration.");
        return snapshot ?? updated;
      }
    },
    [eventId]
  );

  // Debounce GuestsTable updates
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

  const navItems = useMemo(
    () =>
      [
        { id: 'sequence' as const, label: 'Timeline', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M4 11h16M6 21h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
        { id: 'guests' as const, label: 'Invités', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2m12 0H9m1-10a4 4 0 10-8 0 4 4 0 008 0zM21 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" /></svg> },
        { id: 'documents' as const, label: 'Docs', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 4H7a2 2 0 01-2-2V5a2 2 0 012-2h8l6 6v12a2 2 0 01-2 2z" /></svg> },
        { id: 'chat' as const, label: 'Chat', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 15a4 4 0 01-4 4H8l-5 5V7a4 4 0 014-4h10a4 4 0 014 4v8z" /></svg> },
        { id: 'budget' as const, label: 'Budget', icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c0-2.21-1.79-4-4-4S4 5.79 4 8s1.79 4 4 4 4-1.79 4-4zm0 0h0m0 0c0 2.21 1.79 4 4 4s4-1.79 4-4-1.79-4-4-4-4 1.79-4 4zm0 0v0" /></svg> }
      ] as const,
    []
  );

  const handleOpenSequenceEdit = useCallback(() => {
    if (!currentSub) return;
    setSubEditForm({
      title: currentSub.title ?? '',
      date: currentSub.date ? currentSub.date.slice(0, 16) : '',
      location: currentSub.location ?? ''
    });
    setShowSequenceEditModal(true);
  }, [currentSub]);

  const handleSaveSequenceEdit = useCallback(async () => {
    if (!eventId || !subEventId || !canManageSubProgramHere) return;
    const updated = await dbService.updateEventAtomic(eventId, (evt) => ({
      ...evt,
      subEvents: (evt.subEvents ?? []).map((s) =>
        s.id === subEventId
          ? { ...s, title: subEditForm.title.trim() || s.title, date: subEditForm.date || undefined, location: subEditForm.location.trim() || undefined }
          : s
      )
    }));
    setEvent(updated);
    setShowSequenceEditModal(false);
  }, [eventId, subEventId, canManageSubProgramHere, subEditForm]);

  const handleDeleteSequence = useCallback(async () => {
    if (!eventId || !subEventId || !canManageSubProgramHere) return;
    if (!window.confirm('Supprimer cette séquence ?')) return;
    setSequenceDeletingId(subEventId);
    try {
      const updated = await dbService.updateEventAtomic(eventId, (evt) => ({
        ...evt,
        subEvents: (evt.subEvents ?? []).filter((s) => s.id !== subEventId)
      }));
      setEvent(updated);
      navigate(`/event/${eventId}`);
    } finally {
      setSequenceDeletingId(null);
    }
  }, [eventId, subEventId, canManageSubProgramHere, navigate]);

  const handleAddKeyMoment = useCallback(async () => {
    if (!eventId || !subEventId || !canManageSubProgramHere) return;
    if (!momentForm.label.trim()) return;
    setMomentSaving(true);
    try {
      const newMoment: KeyMoment = { id: crypto.randomUUID(), time: momentForm.time || '', label: momentForm.label.trim() };
      const updated = await dbService.updateEventAtomic(eventId, (evt) => ({
        ...evt,
        subEvents: (evt.subEvents ?? []).map((s) =>
          s.id === subEventId ? { ...s, keyMoments: [...(s.keyMoments ?? []), newMoment] } : s
        )
      }));
      setEvent(updated);
      setShowMomentModal(false);
      setMomentForm({ time: '', label: '' });
    } finally {
      setMomentSaving(false);
    }
  }, [eventId, subEventId, canManageSubProgramHere, momentForm]);

  if (loading || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-teal-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !currentSub) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-lg w-full">
          <h1 className="text-lg font-semibold text-slate-900">Séquence introuvable</h1>
          <p className="text-sm text-slate-600 mt-2">{error || 'Réessaie plus tard.'}</p>
          <button
            type="button"
            onClick={() => navigate(`/event/${eventId ?? ''}`)}
            className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 w-full"
          >
            Retour à l’événement
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${V2_PAGE_BG}`}>
      <header
        className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200"
        style={{ paddingTop: 'calc(1rem + var(--safe-area-top))' }}
      >
        <div className="page-container content-padding h-16 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(`/event/${eventId}`)}
            className="touch-target inline-flex items-center justify-center px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            aria-label="Retour"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 truncate">{event.title}</p>
            <h1 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{currentSub.title}</h1>
            <p className="text-xs text-slate-500 truncate">
              {currentSub.date ? new Date(currentSub.date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : 'Date TBD'} · {currentSub.location || 'Lieu à définir'}
            </p>
          </div>
          <div className="hidden sm:flex">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${canManageSubProgramHere || canEditEvent ? 'border-teal-200 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-600'}`}>
              {canManageSubProgramHere || canEditEvent ? 'Édition' : 'Lecture'}
            </span>
          </div>
        </div>
      </header>

      <div className="flex">
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
                  onClick={() => setActiveSubSection(item.id)}
                  className={`w-full inline-flex items-center gap-3 px-4 py-3 rounded-2xl border transition-colors ${
                    activeSubSection === item.id
                      ? 'bg-teal-50 border-teal-100 text-teal-900'
                      : 'bg-white border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200'
                  }`}
                >
                  <Icon active={activeSubSection === item.id}>{item.icon}</Icon>
                  <span className="text-sm font-semibold truncate">{item.label}</span>
                </button>
              ))}
              <div className="pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => navigate(`/event/${eventId}`)}
                  className="w-full inline-flex items-center justify-center px-4 py-3 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold"
                >
                  Retour
                </button>
              </div>
            </nav>
          </div>
        </aside>

        <main className="flex-1 min-w-0 p-3 sm:p-6 md:pb-10 overflow-hidden" style={{ paddingBottom: 'calc(5rem + var(--safe-area-bottom))' }}>
          <div className="h-full overflow-y-auto">
            {activeSubSection === 'sequence' && (
              <section className="space-y-5">
                <V2Card className="p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <V2SectionTitle title="Timeline" subtitle="Moments clés." />
                    {canManageSubProgramHere && (
                      <div className="flex gap-2 flex-wrap justify-end">
                        <button type="button" onClick={() => setShowMomentModal(true)} className={v2BtnPrimary}>
                          + Moment
                        </button>
                        <button type="button" onClick={handleOpenSequenceEdit} className={v2BtnSoft}>
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteSequence()}
                          disabled={sequenceDeletingId === subEventId}
                          className={v2BtnDanger}
                        >
                          {sequenceDeletingId === subEventId ? '…' : 'Supprimer'}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="mt-5">
                    {(!currentSub.keyMoments || currentSub.keyMoments.length === 0) ? (
                      <div className="p-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50">
                        <p className="text-sm text-slate-500 italic">Aucun moment clé.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {currentSub.keyMoments.map((m) => (
                          <div key={m.id} className="p-4 rounded-3xl border border-slate-200 bg-slate-50">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-black text-slate-900 truncate">{m.label}</div>
                                {m.time ? <div className="text-xs text-slate-500 mt-1">{m.time}</div> : <div className="text-xs text-slate-400 mt-1">Heure non précisée</div>}
                              </div>
                              <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-600 shrink-0">
                                {m.time ? 'Horaire' : 'Libre'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </V2Card>
              </section>
            )}

            {activeSubSection === 'guests' && (
              <section className="space-y-4">
                <h2 className="text-lg font-black text-slate-900">Invités</h2>
                <GuestsTable
                  event={event}
                  filterSubEventId={subEventId}
                  canManage={canManageGuestsHere}
                  currentUserId={user.id}
                  onUpdate={handleGuestsTableUpdate}
                  onGuestClick={(g) => setSelectedGuest(g)}
                />
              </section>
            )}

            {activeSubSection === 'documents' && (
              <section className="space-y-4">
                <h2 className="text-lg font-black text-slate-900">Documents</h2>
                <EventDocumentsTab
                  event={event}
                  currentUserId={user.id}
                  subEventId={subEventId}
                  subEvent={currentSub}
                  canManage={canManageDocs}
                  guestsForSub={teamGuestsForSub}
                />
              </section>
            )}

            {activeSubSection === 'chat' && (
              <section className="h-[calc(100dvh-12rem)] min-h-[520px]">
                <V2ChatPanel
                  eventId={event.id}
                  channelId={subEventId}
                  user={user}
                  role={permissions.isOwner ? 'owner' : 'organizer'}
                  canSend={canChatHere}
                />
              </section>
            )}

            {activeSubSection === 'budget' && canViewBudget && (
              <section className="space-y-4">
                <h2 className="text-lg font-black text-slate-900">Budget</h2>
                <SubEventBudgetPage
                  subEvent={currentSub}
                  currency={event.currency ?? 'EUR'}
                  allocatedFromParent={event.subEventBudgets?.[subEventId] ?? 0}
                  canEdit={canManageSubProgramHere}
                  onSaveAllocations={async (allocations) => {
                    if (!eventId) return;
                    const updated = await dbService.updateEventAtomic(eventId, (evt) => ({
                      ...evt,
                      subEvents: (evt.subEvents ?? []).map((s) => (s.id === subEventId ? { ...s, budgetAllocations: allocations } : s))
                    }));
                    setEvent(updated);
                  }}
                  onSaveSubEventColor={
                    canManageSubProgramHere
                      ? async (color) => {
                          if (!eventId) return;
                          const updated = await dbService.updateEventAtomic(eventId, (evt) => ({
                            ...evt,
                            subEvents: (evt.subEvents ?? []).map((s) => (s.id === subEventId ? { ...s, color } : s))
                          }));
                          setEvent(updated);
                        }
                      : undefined
                  }
                />
              </section>
            )}
          </div>
        </main>
      </div>

      <div className="md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/90 backdrop-blur" style={{ paddingBottom: 'calc(1rem + var(--safe-area-bottom))' }}>
        <div className="flex items-center justify-between px-2 py-2">
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

      {showSequenceEditModal && (
        <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-3">
              <h3 className="text-base font-black text-slate-900">Modifier la séquence</h3>
              <button type="button" onClick={() => setShowSequenceEditModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <Input label="Titre" value={subEditForm.title} onChange={(e) => setSubEditForm((p) => ({ ...p, title: e.target.value }))} />
              <Input label="Date (optionnel)" type="datetime-local" value={subEditForm.date} onChange={(e) => setSubEditForm((p) => ({ ...p, date: e.target.value }))} />
              <Input label="Lieu (optionnel)" value={subEditForm.location} onChange={(e) => setSubEditForm((p) => ({ ...p, location: e.target.value }))} />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowSequenceEditModal(false)} className="flex-1 py-3 rounded-2xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50">
                  Annuler
                </button>
                <button type="button" onClick={() => void handleSaveSequenceEdit()} disabled={!canManageSubProgramHere} className="flex-[2] py-3 rounded-2xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed">
                  Enregistrer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMomentModal && (
        <div className="fixed inset-0 z-[230] flex items-end sm:items-center justify-center bg-slate-900/60 p-4" role="dialog" aria-modal="true">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between gap-3">
              <h3 className="text-base font-black text-slate-900">Ajouter un moment clé</h3>
              <button type="button" onClick={() => setShowMomentModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <Input label="Heure (optionnel)" type="time" value={momentForm.time} onChange={(e) => setMomentForm((p) => ({ ...p, time: e.target.value }))} />
              <Input label="Description" placeholder="Ex: Arrivée du photographe" value={momentForm.label} onChange={(e) => setMomentForm((p) => ({ ...p, label: e.target.value }))} />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowMomentModal(false)} className="flex-1 py-3 rounded-2xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50">
                  Annuler
                </button>
                <button type="button" onClick={() => void handleAddKeyMoment()} disabled={!canManageSubProgramHere || !momentForm.label.trim() || momentSaving} className="flex-[2] py-3 rounded-2xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed">
                  {momentSaving ? 'Enregistrement…' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedGuest && (
        <GuestDetailModal
          guest={selectedGuest}
          event={event}
          currentUserId={user.id}
          onClose={() => setSelectedGuest(null)}
          onSave={(updatedEvent) => {
            void persistEventAtomic(updatedEvent).then(() => setSelectedGuest(null));
          }}
        />
      )}
    </div>
  );
};

