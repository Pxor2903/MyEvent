import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Event, HomeView, User } from '@/core/types';
import { dbService } from '@/api';
import { supabase } from '@/api/client';
import { useEvents } from '@/hooks/useEvents';
import { useGuestEvents } from '@/hooks/useGuestEvents';
import { useProviderProfile } from '@/hooks/useProviderProfile';
import { generateSharePassword } from '@/utils/sharePassword';
import { EventCard, type EventCardMenuAction } from '../EventCard';
import { EventForm } from '../EventForm';
import { useAsyncAction } from './useAsyncAction';
import { ProviderDashboard } from './provider/ProviderDashboard';
import './home/home-v2.css';

type ActiveSpace = 'organizer' | 'provider';
type NavTab = 'home' | 'events' | 'providers' | 'profile' | 'messages';

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 768px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const onChange = () => setIsDesktop(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isDesktop;
}

function getGreetingWord(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function getInitials(title: string): string {
  return title
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function formatEventDate(event: Event): string {
  const raw = event.startDate || event.date;
  if (!raw) return 'Date à confirmer';
  return new Date(raw).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function countActiveEvents(events: Event[]): number {
  const now = new Date();
  return events.filter(
    (e) => !e.startDate || new Date(e.endDate || e.startDate || '') >= now
  ).length;
}

function getUpcomingEvent(events: Event[]): Event | undefined {
  return events
    .filter((e) => e.startDate && new Date(e.startDate) > new Date())
    .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime())[0];
}

function daysUntil(dateIso: string): number {
  return Math.ceil((new Date(dateIso).getTime() - Date.now()) / 86400000);
}

function countRecentConfirmed(events: Event[]): number {
  return events.reduce(
    (sum, e) => sum + (e.guests?.filter((g) => g.status === 'confirmed').length ?? 0),
    0
  );
}

// TODO: brancher sur getMyConversations() et compter unreadCount > 0
const UNREAD_MESSAGES = 0;

export const HomeV2: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const eventsListRef = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<HomeView>('dashboard');
  const [mobileTab, setMobileTab] = useState<NavTab>('home');
  const [desktopNav, setDesktopNav] = useState<NavTab>('home');

  const { events, loading: organizerLoading, fetchEvents } = useEvents(user.id);
  const { events: guestEvents, loading: guestLoading, fetchGuestEvents } = useGuestEvents(user);
  const [activeRoleView, setActiveRoleView] = useState<'organizer' | 'guest'>('organizer');
  const { profile: providerProfile, isApprovedProvider } = useProviderProfile();
  const [activeSpace, setActiveSpace] = useState<ActiveSpace>('organizer');

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinData, setJoinData] = useState({ code: '', password: '' });
  const [joinError, setJoinError] = useState('');
  const { pending: creatingEvent, run: runCreate } = useAsyncAction();
  const { pending: joiningEvent, run: runJoin } = useAsyncAction();

  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoEventId, setPhotoEventId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const displayedEvents = activeRoleView === 'organizer' ? events : guestEvents;
  const loading = activeRoleView === 'organizer' ? organizerLoading : guestLoading;
  const activeEventsCount = countActiveEvents(events);
  const upcoming = getUpcomingEvent(events);
  const daysUntilUpcoming = upcoming?.startDate ? daysUntil(upcoming.startDate) : null;
  const recentConfirmed = countRecentConfirmed(events);

  const statsEvent = upcoming ?? events[0];
  const totalGuests = statsEvent?.guests?.length ?? 0;
  const confirmedGuests =
    statsEvent?.guests?.filter((g) => g.status === 'confirmed').length ?? 0;
  const pendingGuests =
    statsEvent?.guests?.filter((g) => g.status === 'pending').length ?? 0;
  const declinedGuests =
    statsEvent?.guests?.filter((g) => g.status === 'declined').length ?? 0;

  const userInitials =
    (user.firstName?.[0] ?? '').concat(user.lastName?.[0] ?? '').toUpperCase() || '?';

  const scrollToEvents = () => {
    const el = document.getElementById('events-list') ?? eventsListRef.current;
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const goToProfile = () => navigate('/profile');

  const goToProviders = () => {
    // TODO: navigate('/providers') quand la route existera
    navigate('/profile');
  };

  const goToMessages = () => {
    // TODO: navigate('/messages') quand la route existera
    console.log('coming soon');
  };

  const handleCreate = async (data: Record<string, unknown>) => {
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
        missions: [],
      } as Event;
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
      fetchGuestEvents();
      alert('Demande envoyée. Le créateur doit vous approuver dans l’onglet Équipe.');
    });
  };

  const handleMenuAction = (action: EventCardMenuAction, eventId: string) => {
    if (action === 'photo') {
      setPhotoEventId(eventId);
      photoInputRef.current?.click();
      return;
    }
    if (action === 'edit') {
      navigate(`/event/${eventId}`);
      return;
    }
    if (action === 'delete') {
      if (!window.confirm('Supprimer cet événement ?')) return;
      void dbService.deleteEvent(eventId).then(() => fetchEvents());
    }
  };

  const handlePhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !photoEventId) return;
    const event = events.find((ev) => ev.id === photoEventId);
    if (!event) return;
    setUploadingPhoto(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `event-images/${photoEventId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('event-files').upload(path, file, {
        upsert: true,
        contentType: file.type || undefined,
      });
      if (uploadError) throw new Error(uploadError.message);
      const { data: { publicUrl } } = supabase.storage.from('event-files').getPublicUrl(path);
      await dbService.saveEvent({ ...event, image: publicUrl });
      fetchEvents();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Impossible d'envoyer la photo.");
    } finally {
      setUploadingPhoto(false);
      setPhotoEventId(null);
    }
  };

  const handleMobileTab = (tab: NavTab) => {
    setMobileTab(tab);
    if (tab === 'profile') {
      goToProfile();
      return;
    }
    if (tab === 'providers') {
      goToProviders();
      return;
    }
    if (tab === 'events') {
      scrollToEvents();
      return;
    }
    setMobileTab('home');
  };

  const handleDesktopNav = (tab: NavTab) => {
    setDesktopNav(tab);
    if (tab === 'profile') {
      goToProfile();
      return;
    }
    if (tab === 'providers') {
      goToProviders();
      return;
    }
    if (tab === 'messages') {
      goToMessages();
      return;
    }
    if (tab === 'events') {
      scrollToEvents();
    }
  };

  const openEvent = (ev: Event) => {
    if (activeRoleView === 'organizer') navigate(`/event/${ev.id}`);
    else navigate(`/guest/event/${ev.id}`);
  };

  const shell = (content: React.ReactNode) => (
    <div className="home-v2">
      {isDesktop && (
        <DesktopSidebar
          active={desktopNav}
          user={user}
          userInitials={userInitials}
          onNav={handleDesktopNav}
          onProfileClick={goToProfile}
          unreadMessages={UNREAD_MESSAGES}
        />
      )}
      <div className="home-v2-main">{content}</div>
      {!isDesktop && (
        <MobileBottomBar active={mobileTab} onTab={handleMobileTab} />
      )}
    </div>
  );

  if (activeSpace === 'provider') {
    return shell(
      <>
        {!isDesktop && <MobileHeader userInitials={userInitials} />}
        {isApprovedProvider && (
          <SpaceSwitcher activeSpace={activeSpace} onChange={setActiveSpace} />
        )}
        <div style={{ padding: isDesktop ? '24px 32px' : '16px' }}>
          <ProviderDashboard user={user} />
        </div>
      </>
    );
  }

  if (view === 'create-event') {
    return shell(
      <>
        {!isDesktop && <MobileHeader userInitials={userInitials} />}
        {isApprovedProvider && (
          <SpaceSwitcher activeSpace={activeSpace} onChange={setActiveSpace} />
        )}
        <div
          style={{
            padding: isDesktop ? '28px 32px' : '16px',
            maxWidth: 720,
            margin: '0 auto',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 20,
              border: '1px solid var(--card-border)',
              padding: '20px 24px',
            }}
          >
            <EventForm
              user={user}
              onCancel={() => setView('dashboard')}
              onSubmit={handleCreate}
              submitting={creatingEvent}
            />
          </div>
        </div>
      </>
    );
  }

  return shell(
    <>
      <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={handlePhotoFile} />

      {!isDesktop && <MobileHeader userInitials={userInitials} />}

      {isApprovedProvider && (
        <SpaceSwitcher activeSpace={activeSpace} onChange={setActiveSpace} />
      )}

      <section className="home-v2-hero">
        <h1 className="home-v2-greeting">
          {getGreetingWord()}, {user.firstName}.
        </h1>
      </section>

      <section className="home-v2-stats">
        <button
          type="button"
          className="home-v2-stat home-v2-stat--dark"
          onClick={scrollToEvents}
        >
          <div className="home-v2-stat-value home-v2-stat-value--cognac">{activeEventsCount}</div>
          <div className="home-v2-stat-label home-v2-stat-label--on-dark">Événements actifs</div>
        </button>

        <button
          type="button"
          className="home-v2-stat home-v2-stat--light"
          onClick={() => {
            if (upcoming) navigate(`/event/${upcoming.id}`);
            else setView('create-event');
          }}
        >
          {upcoming && daysUntilUpcoming != null ? (
            <>
              <div className="home-v2-stat-value home-v2-stat-value--dark">
                {daysUntilUpcoming}j
              </div>
              <div className="home-v2-stat-label home-v2-stat-label--cognac">
                {upcoming.title.length > 15
                  ? `${upcoming.title.slice(0, 15)}…`
                  : upcoming.title}
              </div>
            </>
          ) : (
            <>
              <div className="home-v2-stat-value home-v2-stat-value--dark">—</div>
              <div className="home-v2-stat-label home-v2-stat-label--cognac">
                Aucun événement à venir
              </div>
            </>
          )}
        </button>

        <button
          type="button"
          className="home-v2-stat home-v2-stat--light"
          onClick={goToMessages}
        >
          <div className="home-v2-stat-value home-v2-stat-value--dark">{UNREAD_MESSAGES}</div>
          <div className="home-v2-stat-label home-v2-stat-label--muted">Messages non lus</div>
        </button>
      </section>

      {recentConfirmed > 0 && (
        <div className="home-v2-alert">
          <span className="home-v2-alert-dot" aria-hidden />
          {recentConfirmed} invité{recentConfirmed > 1 ? 's ont' : ' a'} confirmé leur présence
        </div>
      )}

      <div className="home-v2-body">
        <div className="home-v2-body-main">
          <div className="home-v2-events-header">
            <div className="home-v2-role-tabs">
              <button
                type="button"
                className={`home-v2-role-tab${activeRoleView === 'organizer' ? ' home-v2-role-tab--active' : ''}`}
                onClick={() => setActiveRoleView('organizer')}
              >
                Organisateur
              </button>
              <button
                type="button"
                className={`home-v2-role-tab${activeRoleView === 'guest' ? ' home-v2-role-tab--active' : ''}`}
                onClick={() => setActiveRoleView('guest')}
              >
                Invité
              </button>
            </div>
            {activeRoleView === 'organizer' && (
              <button
                type="button"
                className="home-v2-btn-create"
                onClick={() => setView('create-event')}
              >
                + Créer
              </button>
            )}
          </div>

          <p className="home-v2-section-label">
            {activeRoleView === 'organizer' ? 'Mes événements' : 'Invitations reçues'}
          </p>

          <div id="events-list" ref={eventsListRef}>
            {!isDesktop && (
              <EventsMobileStrip
                loading={loading}
                events={displayedEvents}
                isOrganizer={activeRoleView === 'organizer'}
                onOpen={openEvent}
                onMenuAction={activeRoleView === 'organizer' ? handleMenuAction : undefined}
                onCreate={() => setView('create-event')}
              />
            )}

            {isDesktop && (
              <EventsDesktopList
                loading={loading}
                events={displayedEvents}
                isOrganizer={activeRoleView === 'organizer'}
                onOpen={(ev) => navigate(`/event/${ev.id}`)}
                onCreate={() => setView('create-event')}
              />
            )}

            {!loading && displayedEvents.length === 0 && (
              <div className="home-v2-empty">
                <p>
                  {activeRoleView === 'organizer'
                    ? 'Aucun événement organisé'
                    : "Tu n'es invité à aucun événement pour l'instant."}
                </p>
                {activeRoleView === 'organizer' && (
                  <button
                    type="button"
                    className="home-v2-btn-create"
                    style={{ marginTop: 12 }}
                    onClick={() => setView('create-event')}
                  >
                    + Créer mon premier événement
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <aside className="home-v2-body-aside">
          <div className="home-v2-aside-desktop">
            {upcoming && daysUntilUpcoming != null && (
              <CountdownWidget event={upcoming} days={daysUntilUpcoming} />
            )}
            <GuestResponsesCard
              total={totalGuests}
              confirmed={confirmedGuests}
              pending={pendingGuests}
              declined={declinedGuests}
            />
          </div>
          <div className="home-v2-aside-mobile">
            <GuestResponsesCard
              total={totalGuests}
              confirmed={confirmedGuests}
              pending={pendingGuests}
              declined={declinedGuests}
            />
          </div>
        </aside>
      </div>

      {!isDesktop && activeRoleView === 'organizer' && (
        <button type="button" className="home-v2-join-fab" onClick={() => setShowJoinModal(true)}>
          Rejoindre
        </button>
      )}

      {!isApprovedProvider && activeRoleView === 'organizer' && (
        <ProviderBanner onLearnMore={() => navigate('/register-provider')} />
      )}

      {uploadingPhoto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            background: 'rgba(10,10,10,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 600,
          }}
        >
          Envoi de la photo…
        </div>
      )}

      {showJoinModal && <JoinModal {...{ joinData, joinError, joiningEvent, setShowJoinModal, setJoinData, handleJoin }} />}
    </>
  );
};

/* ——— Sous-composants ——— */

function MobileHeader({ userInitials }: { userInitials: string }) {
  const navigate = useNavigate();
  return (
    <header className="home-v2-mobile-header">
      <LogoMark />
      <button
        type="button"
        onClick={() => navigate('/profile')}
        aria-label="Profil"
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          background: 'var(--cognac-light)',
          border: '2px solid var(--cognac)',
          color: 'var(--cognac)',
          fontSize: 11,
          fontWeight: 800,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {userInitials}
      </button>
    </header>
  );
}

function LogoMark() {
  return (
    <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.5px' }}>
      <span style={{ color: 'var(--dark)' }}>my</span>
      <span style={{ color: 'var(--cognac)' }}>Event</span>
    </span>
  );
}

function MobileBottomBar({
  active,
  onTab,
}: {
  active: NavTab;
  onTab: (t: NavTab) => void;
}) {
  const tab = (id: NavTab, label: string, icon: React.ReactNode) => (
    <button
      type="button"
      className={`home-v2-tab ${active === id ? 'home-v2-tab--active' : 'home-v2-tab--inactive'}`}
      onClick={() => onTab(id)}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <nav className="home-v2-bottom-bar" aria-label="Navigation principale">
      {tab(
        'home',
        'Accueil',
        <svg viewBox="0 0 24 24">
          <rect x="3" y="3" width="8" height="8" rx="1" />
          <rect x="13" y="3" width="8" height="8" rx="1" />
          <rect x="3" y="13" width="8" height="8" rx="1" />
          <rect x="13" y="13" width="8" height="8" rx="1" />
        </svg>
      )}
      {tab(
        'events',
        'Événements',
        <svg viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      )}
      {tab(
        'providers',
        'Prestataires',
        <svg viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
      )}
      {tab(
        'profile',
        'Profil',
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      )}
    </nav>
  );
}

function DesktopSidebar({
  active,
  user,
  userInitials,
  onNav,
  onProfileClick,
  unreadMessages,
}: {
  active: NavTab;
  user: User;
  userInitials: string;
  onNav: (t: NavTab) => void;
  onProfileClick: () => void;
  unreadMessages: number;
}) {
  const item = (id: NavTab, label: string, icon: React.ReactNode, badge?: number) => (
    <button
      type="button"
      className={`home-v2-nav-item${active === id ? ' home-v2-nav-item--active' : ''}`}
      onClick={() => onNav(id)}
    >
      {icon}
      {label}
      {badge != null && badge > 0 ? (
        <span className="home-v2-nav-badge">{badge}</span>
      ) : null}
    </button>
  );

  return (
    <aside className="home-v2-sidebar">
      <div style={{ marginBottom: 32 }}>
        <span style={{ fontSize: 18, fontWeight: 800 }}>
          <span style={{ color: '#fff' }}>my</span>
          <span style={{ color: 'var(--cognac)' }}>Event</span>
        </span>
      </div>

      <nav style={{ flex: 1 }}>
        {item(
          'home',
          'Accueil',
          <svg viewBox="0 0 24 24">
            <rect x="3" y="3" width="8" height="8" rx="1" />
            <rect x="13" y="3" width="8" height="8" rx="1" />
            <rect x="3" y="13" width="8" height="8" rx="1" />
            <rect x="13" y="13" width="8" height="8" rx="1" />
          </svg>
        )}
        {item(
          'events',
          'Événements',
          <svg viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        )}
        {item(
          'providers',
          'Prestataires',
          <svg viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-4-4" />
          </svg>
        )}
        {item(
          'messages',
          'Messages',
          <svg viewBox="0 0 24 24">
            <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
          </svg>,
          unreadMessages
        )}
        {item(
          'profile',
          'Profil',
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
          </svg>
        )}
      </nav>

      <button
        type="button"
        onClick={onProfileClick}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 8px',
          marginTop: 'auto',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
        }}
      >
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'rgba(196,135,58,0.2)',
            border: '1px solid var(--cognac-border)',
            color: 'var(--cognac)',
            fontSize: 12,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {userInitials}
        </span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {user.firstName} {user.lastName}
        </span>
      </button>
    </aside>
  );
}

function SpaceSwitcher({
  activeSpace,
  onChange,
}: {
  activeSpace: ActiveSpace;
  onChange: (s: ActiveSpace) => void;
}) {
  const tab = (id: ActiveSpace, label: string) => (
    <button
      type="button"
      onClick={() => onChange(id)}
      style={{
        flex: 1,
        minHeight: 40,
        borderRadius: 100,
        border: 'none',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        background: activeSpace === id ? 'var(--dark)' : 'transparent',
        color: activeSpace === id ? '#F5EAD8' : '#888',
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="home-v2-space-switcher">
      <div
        style={{
          display: 'inline-flex',
          width: '100%',
          maxWidth: 360,
          background: 'rgba(0,0,0,0.04)',
          borderRadius: 100,
          padding: 3,
          gap: 2,
        }}
      >
        {tab('organizer', '🎪 Organisateur')}
        {tab('provider', '🎯 Prestataire')}
      </div>
    </div>
  );
}

function EventsMobileStrip({
  loading,
  events,
  isOrganizer,
  onOpen,
  onMenuAction,
  onCreate,
}: {
  loading: boolean;
  events: Event[];
  isOrganizer: boolean;
  onOpen: (e: Event) => void;
  onMenuAction?: (action: EventCardMenuAction, eventId: string) => void;
  onCreate: () => void;
}) {
  if (loading) {
    return (
      <div className="home-v2-events-scroll">
        {[0, 1, 2].map((i) => (
          <div key={i} className="home-v2-skeleton-card" />
        ))}
      </div>
    );
  }

  return (
    <div className="home-v2-events-scroll">
      {events.map((ev) => (
        <div key={ev.id} className="home-v2-card-slot">
          <EventCard event={ev} onClick={() => onOpen(ev)} onMenuAction={onMenuAction} />
        </div>
      ))}
      {isOrganizer && (
        <button type="button" className="home-v2-new-event" onClick={onCreate}>
          <span className="home-v2-new-event-icon">+</span>
          <span>Nouvel événement</span>
        </button>
      )}
    </div>
  );
}

function EventsDesktopList({
  loading,
  events,
  isOrganizer,
  onOpen,
  onCreate,
}: {
  loading: boolean;
  events: Event[];
  isOrganizer: boolean;
  onOpen: (e: Event) => void;
  onCreate: () => void;
}) {
  if (loading) {
    return (
      <div className="home-v2-events-list">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: 76,
              borderRadius: 14,
              background: 'var(--cognac-light)',
              animation: 'home-v2-pulse 1.5s ease-in-out infinite',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="home-v2-events-list">
      {events.map((ev) => (
        <EventRow key={ev.id} event={ev} onClick={() => onOpen(ev)} />
      ))}
      {isOrganizer && events.length === 0 ? null : null}
    </div>
  );
}

type EventRowProps = {
  event: Event;
  onClick: () => void;
};

const EventRow: React.FC<EventRowProps> = ({ event, onClick }) => {
  const guests = event.guests ?? [];
  const pending = guests.filter((g) => g.status === 'pending').length;
  const hasPhoto = Boolean(event.image?.trim());

  return (
    <button type="button" className="home-v2-event-row" onClick={onClick}>
      <div className="home-v2-event-thumb">
        {hasPhoto ? (
          <img src={event.image} alt="" />
        ) : (
          getInitials(event.title)
        )}
      </div>
      <div className="home-v2-event-info">
        <p className="home-v2-event-title">{event.title}</p>
        <p className="home-v2-event-meta">
          {formatEventDate(event)} · {guests.length} invité{guests.length !== 1 ? 's' : ''}
        </p>
      </div>
      <span
        className={`home-v2-event-badge ${pending > 0 ? 'home-v2-event-badge--pending' : 'home-v2-event-badge--ok'}`}
      >
        {pending > 0 ? `${pending} en attente` : 'À jour ✓'}
      </span>
    </button>
  );
};

function CountdownWidget({ event, days }: { event: Event; days: number }) {
  return (
    <div className="home-v2-countdown">
      <p className="home-v2-countdown-label">Prochain événement</p>
      <p className="home-v2-countdown-name">{event.title}</p>
      <p className="home-v2-countdown-value">{days}</p>
      <p className="home-v2-countdown-unit">JOURS</p>
    </div>
  );
}

function GuestResponsesCard({
  total,
  confirmed,
  pending,
  declined,
}: {
  total: number;
  confirmed: number;
  pending: number;
  declined: number;
}) {
  const pct = (n: number) => (total > 0 ? `${(n / total) * 100}%` : '0%');

  const row = (label: string, count: number, color: string) => (
    <div className="home-v2-progress-row" key={label}>
      <span className="home-v2-progress-label">{label}</span>
      <div className="home-v2-progress-track">
        <div className="home-v2-progress-fill" style={{ width: pct(count), background: color }} />
      </div>
      <span className="home-v2-progress-count">{count}</span>
    </div>
  );

  return (
    <div className="home-v2-responses">
      <h3 className="home-v2-responses-title">Réponses invités</h3>
      {row('Confirmés', confirmed, 'var(--cognac)')}
      {row('En attente', pending, '#E8D8C0')}
      {row('Déclinés', declined, '#F5EDE0')}
    </div>
  );
}

function ProviderBanner({ onLearnMore }: { onLearnMore: () => void }) {
  return (
    <div className="home-v2-provider-banner">
      <span className="home-v2-provider-icon" aria-hidden>
        ⭐
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13 }}>Devenez prestataire</div>
        <div style={{ fontSize: 11, color: 'var(--cognac)' }}>Proposez vos services</div>
      </div>
      <button
        type="button"
        onClick={onLearnMore}
        style={{
          marginLeft: 'auto',
          background: '#fff',
          border: '1px solid rgba(196,135,58,0.25)',
          color: 'var(--cognac)',
          fontSize: 12,
          fontWeight: 700,
          padding: '6px 12px',
          borderRadius: 8,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        En savoir plus →
      </button>
    </div>
  );
}

function JoinModal({
  joinData,
  joinError,
  joiningEvent,
  setShowJoinModal,
  setJoinData,
  handleJoin,
}: {
  joinData: { code: string; password: string };
  joinError: string;
  joiningEvent: boolean;
  setShowJoinModal: (v: boolean) => void;
  setJoinData: React.Dispatch<React.SetStateAction<{ code: string; password: string }>>;
  handleJoin: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={() => !joiningEvent && setShowJoinModal(false)}
    >
      <div
        style={{
          background: '#fff',
          width: '100%',
          maxWidth: 400,
          borderRadius: 20,
          padding: 24,
          margin: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--dark)' }}>
          Rejoindre un événement
        </h3>
        <p style={{ margin: '8px 0 20px', fontSize: 13, color: '#AAA' }}>
          Entre la clé et le mot de passe fournis par l&apos;organisateur.
        </p>
        <input
          className="join-modal-input"
          placeholder="Clé"
          value={joinData.code}
          onChange={(e) => setJoinData((p) => ({ ...p, code: e.target.value }))}
          style={joinInputStyle}
        />
        <input
          className="join-modal-input"
          type="password"
          placeholder="Mot de passe"
          value={joinData.password}
          onChange={(e) => setJoinData((p) => ({ ...p, password: e.target.value }))}
          style={joinInputStyle}
        />
        {joinError && (
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#E53E3E' }}>{joinError}</p>
        )}
        <button
          type="button"
          onClick={handleJoin}
          disabled={joiningEvent}
          style={{
            width: '100%',
            background: 'var(--cognac)',
            color: '#fff',
            border: 'none',
            borderRadius: 12,
            padding: 13,
            fontSize: 14,
            fontWeight: 700,
            cursor: joiningEvent ? 'wait' : 'pointer',
            opacity: joiningEvent ? 0.7 : 1,
          }}
        >
          {joiningEvent ? 'Envoi…' : 'Envoyer'}
        </button>
      </div>
    </div>
  );
}

const joinInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: 12,
  border: '1.5px solid var(--card-border)',
  fontSize: 14,
  outline: 'none',
  marginBottom: 12,
  boxSizing: 'border-box',
};
