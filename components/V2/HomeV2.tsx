import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Event, HomeView, User } from '@/core/types';
import { dbService } from '@/api';
import { supabase } from '@/api/client';
import { useEvents } from '@/hooks/useEvents';
import { useGuestEvents } from '@/hooks/useGuestEvents';
import { useProviderProfile } from '@/hooks/useProviderProfile';
import { generateSharePassword } from '@/utils/sharePassword';
import { EventCard, type EventCardMenuAction } from '../EventCard';
import { Footer } from '../Footer';
import { EventForm } from '../EventForm';
import { useAsyncAction } from './useAsyncAction';
import { ProviderDashboard } from './provider/ProviderDashboard';

type ActiveSpace = 'organizer' | 'provider';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 18) return 'Bonjour,';
  return 'Bonsoir,';
}

function countActiveEvents(events: Event[]): number {
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  return events.filter((e) => {
    if (e.endDate) {
      return new Date(e.endDate).getTime() > now;
    }
    if (e.startDate) {
      return new Date(e.startDate).getTime() > thirtyDaysAgo;
    }
    if (e.date) {
      return new Date(e.date).getTime() > thirtyDaysAgo;
    }
    return (e.subEvents ?? []).some((se) => se.date && new Date(se.date).getTime() > now);
  }).length;
}

function countTotalGuests(events: Event[]): number {
  return events.reduce((sum, e) => {
    const fromGuests = (e.guests ?? []).reduce((s, g) => s + (g.guestCount ?? 1), 0);
    return sum + fromGuests + (e.generalGuestsCount ?? 0);
  }, 0);
}

export const HomeV2: React.FC<{ user: User; onLogout: () => void }> = ({ user, onLogout }) => {
  const [view, setView] = useState<HomeView>('dashboard');
  const navigate = useNavigate();
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
  const totalGuestsCount = countTotalGuests(events);

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

      const {
        data: { publicUrl },
      } = supabase.storage.from('event-files').getPublicUrl(path);

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

  const userInitials =
    (user.firstName?.[0] ?? '').concat(user.lastName?.[0] ?? '').toUpperCase() || '?';

  if (activeSpace === 'provider') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <HomeNav user={user} userInitials={userInitials} onLogout={onLogout} />
        {isApprovedProvider && (
          <SpaceSwitcher activeSpace={activeSpace} onChange={setActiveSpace} />
        )}
        <main style={{ padding: '24px 28px', paddingBottom: 'calc(5rem + var(--safe-area-bottom))' }}>
          <ProviderDashboard user={user} />
        </main>
        <Footer onNavigate={() => {}} />
      </div>
    );
  }

  if (view === 'create-event') {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
        <HomeNav user={user} userInitials={userInitials} onLogout={onLogout} />
        {isApprovedProvider && (
          <SpaceSwitcher activeSpace={activeSpace} onChange={setActiveSpace} />
        )}
        <main
          style={{
            padding: '24px 28px',
            maxWidth: 720,
            margin: '0 auto',
            paddingBottom: 'calc(5rem + var(--safe-area-bottom))',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 20,
              border: '1px solid var(--card-border)',
              padding: '20px 24px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
            }}
          >
            <EventForm
              user={user}
              onCancel={() => setView('dashboard')}
              onSubmit={handleCreate}
              submitting={creatingEvent}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handlePhotoFile}
      />

      <HomeNav user={user} userInitials={userInitials} onLogout={onLogout} />

      {isApprovedProvider && (
        <SpaceSwitcher activeSpace={activeSpace} onChange={setActiveSpace} />
      )}

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 24,
          padding: '40px 28px 28px',
          alignItems: 'start',
        }}
      >
        <div>
          <span
            style={{
              display: 'inline-block',
              background: '#F5EAD8',
              color: 'var(--cognac)',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              padding: '6px 12px',
              borderRadius: 100,
            }}
          >
            Tableau de bord
          </span>
          <h1
            style={{
              margin: '16px 0 0',
              fontSize: 38,
              fontWeight: 800,
              letterSpacing: '-1.5px',
              color: 'var(--dark)',
              lineHeight: 1.1,
            }}
          >
            {getGreeting()}
            <br />
            <span style={{ color: 'var(--cognac)' }}>{user.firstName}</span>
          </h1>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <StatBlock
            dark
            value={activeEventsCount}
            label="Événements actifs"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--cognac)" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            }
          />
          <StatBlock
            value={totalGuestsCount}
            label="Invités au total"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--dark)" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            }
          />
        </div>
      </section>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 28px 22px',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <RoleTabs active={activeRoleView} onChange={setActiveRoleView} />
        {activeRoleView === 'organizer' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => setView('create-event')}
              style={{
                background: 'var(--cognac)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 14,
                padding: '10px 18px',
                cursor: 'pointer',
              }}
            >
              + Créer
            </button>
            <button
              type="button"
              onClick={() => setShowJoinModal(true)}
              style={{
                background: '#fff',
                border: '1.5px solid #E8E8E8',
                color: 'var(--text-secondary)',
                borderRadius: 10,
                fontWeight: 600,
                fontSize: 14,
                padding: '10px 18px',
                cursor: 'pointer',
              }}
            >
              Rejoindre
            </button>
          </div>
        )}
      </div>

      <p className="home-section-label" style={{ padding: '0 28px 14px' }}>
        {activeRoleView === 'organizer' ? 'Mes événements' : 'Invitations reçues'}
      </p>

      <div
        style={{
          padding: '0 28px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 14,
          paddingBottom: 16,
        }}
      >
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                aspectRatio: '1 / 1',
                borderRadius: 18,
                background: 'var(--cognac-light)',
                border: '1px solid var(--card-border)',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          ))
        ) : displayedEvents.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              padding: 48,
              color: 'var(--text-secondary)',
              fontSize: 14,
              border: '1px dashed var(--card-border)',
              borderRadius: 18,
              background: '#fff',
            }}
          >
            {activeRoleView === 'organizer'
              ? "Aucun événement organisé pour l'instant."
              : 'Aucun événement invité trouvé (vérifie email/téléphone sur ton profil).'}
          </div>
        ) : (
          displayedEvents.map((ev) => (
            <EventCard
              key={ev.id}
              event={ev}
              onClick={() => {
                if (activeRoleView === 'organizer') navigate(`/event/${ev.id}`);
                else navigate(`/guest/event/${ev.id}`);
              }}
              onMenuAction={activeRoleView === 'organizer' ? handleMenuAction : undefined}
            />
          ))
        )}
      </div>

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

      {!providerProfile && activeRoleView === 'organizer' && (
        <div style={{ padding: '8px 28px 24px' }}>
          <BecomeProviderBanner onLearnMore={() => navigate('/profile/devenir-prestataire')} />
        </div>
      )}

      <Footer onNavigate={() => {}} />

      {showJoinModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            background: 'rgba(10,10,10,0.5)',
          }}
          onClick={() => !joiningEvent && setShowJoinModal(false)}
        >
          <div
            style={{
              background: '#fff',
              width: '100%',
              maxWidth: 420,
              borderRadius: 20,
              padding: 28,
              boxShadow: '0 24px 64px rgba(0,0,0,0.12)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--dark)' }}>
              Rejoindre un événement
            </h3>
            <p style={{ margin: '8px 0 20px', fontSize: 14, color: 'var(--text-secondary)' }}>
              Saisis la clé et le mot de passe partagés par l&apos;organisateur.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <JoinInput
                placeholder="Clé"
                value={joinData.code}
                onChange={(code) => setJoinData((p) => ({ ...p, code }))}
              />
              <JoinInput
                placeholder="Mot de passe"
                type="password"
                value={joinData.password}
                onChange={(password) => setJoinData((p) => ({ ...p, password }))}
              />
              {joinError && (
                <p style={{ margin: 0, fontSize: 13, color: '#E53E3E' }}>{joinError}</p>
              )}
              <button
                type="button"
                onClick={handleJoin}
                disabled={joiningEvent}
                style={{
                  marginTop: 4,
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--cognac)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: joiningEvent ? 'wait' : 'pointer',
                  opacity: joiningEvent ? 0.7 : 1,
                }}
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

function HomeNav({
  user,
  userInitials,
  onLogout,
}: {
  user: User;
  userInitials: string;
  onLogout: () => void;
}) {
  const navigate = useNavigate();
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        height: 60,
        padding: '0 28px',
        paddingTop: 'var(--safe-area-top)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(250,250,247,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'var(--dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--cognac)" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </div>
        <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.5px' }}>
          <span style={{ color: 'var(--dark)' }}>my</span>
          <span style={{ color: 'var(--cognac)' }}>Event</span>
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={() => navigate('/profile')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: 10,
          }}
        >
          {user.avatar ? (
            <img
              src={user.avatar}
              alt=""
              style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#F5EAD8',
                color: 'var(--cognac)',
                fontSize: 12,
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {userInitials}
            </span>
          )}
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--dark)',
              maxWidth: 140,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {user.firstName}
          </span>
        </button>
        <button
          type="button"
          onClick={onLogout}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            background: '#fff',
            border: '1px solid #E8E8E8',
            borderRadius: 8,
            padding: '8px 12px',
            cursor: 'pointer',
          }}
        >
          Déconnexion
        </button>
      </div>
    </header>
  );
}

function SpaceSwitcher({
  activeSpace,
  onChange,
}: {
  activeSpace: ActiveSpace;
  onChange: (s: ActiveSpace) => void;
}) {
  const tab = (id: ActiveSpace, label: string, emoji: string) => (
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
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {emoji} {label}
    </button>
  );

  return (
    <div style={{ padding: '12px 28px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
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
        {tab('organizer', 'Organisateur', '🎪')}
        {tab('provider', 'Prestataire', '🎯')}
      </div>
    </div>
  );
}

function RoleTabs({
  active,
  onChange,
}: {
  active: 'organizer' | 'guest';
  onChange: (v: 'organizer' | 'guest') => void;
}) {
  const btn = (id: 'organizer' | 'guest', label: string) => (
    <button
      type="button"
      onClick={() => onChange(id)}
      style={{
        padding: '8px 18px',
        borderRadius: 100,
        border: 'none',
        fontSize: 13,
        fontWeight: 700,
        cursor: 'pointer',
        background: active === id ? 'var(--dark)' : 'transparent',
        color: active === id ? '#F5EAD8' : '#888',
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        background: 'rgba(0,0,0,0.04)',
        borderRadius: 100,
        padding: 3,
        display: 'inline-flex',
      }}
    >
      {btn('organizer', 'Organisateur')}
      {btn('guest', 'Invité')}
    </div>
  );
}

function StatBlock({
  value,
  label,
  icon,
  dark,
}: {
  value: number;
  label: string;
  icon: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <div
      style={{
        background: dark ? 'var(--dark)' : '#fff',
        border: dark ? 'none' : '1px solid var(--card-border)',
        borderRadius: 14,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: dark ? 'var(--cognac)' : 'var(--dark)',
            letterSpacing: '-0.5px',
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        <div
          style={{
            marginTop: 6,
            fontSize: 12,
            fontWeight: 500,
            color: dark ? 'rgba(196,135,58,0.5)' : '#AAA',
          }}
        >
          {label}
        </div>
      </div>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 10,
          background: dark ? 'rgba(196,135,58,0.15)' : '#F5EAD8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
    </div>
  );
}

function BecomeProviderBanner({ onLearnMore }: { onLearnMore: () => void }) {
  return (
    <div
      style={{
        background: 'linear-gradient(105deg, #F5EAD8 0%, #FDF5EC 100%)',
        border: '1px solid var(--cognac-border)',
        borderRadius: 14,
        padding: '20px 22px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flex: 1, minWidth: 200 }}>
        <span style={{ fontSize: 28 }} aria-hidden>
          ⭐
        </span>
        <div>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--dark)' }}>
            Devenez prestataire
          </h3>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
            Proposez vos services aux organisateurs d&apos;événements sur myEvent.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onLearnMore}
        style={{
          background: '#fff',
          border: '1.5px solid var(--cognac-border)',
          color: 'var(--cognac)',
          borderRadius: 10,
          padding: '10px 18px',
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        En savoir plus →
      </button>
    </div>
  );
}

function JoinInput({
  placeholder,
  value,
  onChange,
  type = 'text',
}: {
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="join-modal-input"
      style={{
        width: '100%',
        padding: '12px 14px',
        borderRadius: 10,
        border: '1.5px solid #E8E8E8',
        fontSize: 15,
        outline: 'none',
        boxSizing: 'border-box',
      }}
    />
  );
}
