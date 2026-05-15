import React, { useEffect, useRef, useState } from 'react';
import type { Event, Guest } from '@/core/types';

export type EventCardMenuAction = 'photo' | 'edit' | 'delete';

interface EventCardProps {
  event: Event;
  onClick?: () => void;
  onMenuAction?: (action: EventCardMenuAction, eventId: string) => void;
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

function guestDisplayName(g: Guest): string {
  const a = (g.firstName?.[0] ?? '').toUpperCase();
  const b = (g.lastName?.[0] ?? '').toUpperCase();
  return (a + b) || '?';
}

function guestCount(event: Event): number {
  return event.guests?.length ?? 0;
}

const cardBase: React.CSSProperties = {
  position: 'relative',
  aspectRatio: '1 / 1',
  borderRadius: 18,
  overflow: 'hidden',
  cursor: 'pointer',
  border: '1px solid var(--card-border)',
  transition: 'box-shadow 0.2s',
  width: '100%',
};

function ThreeDotsIcon({ color }: { color: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill={color} aria-hidden>
      <circle cx="2.5" cy="7" r="1.25" />
      <circle cx="7" cy="7" r="1.25" />
      <circle cx="11.5" cy="7" r="1.25" />
    </svg>
  );
}

function CardMenu({
  hasPhoto,
  photoMode,
  onMenuAction,
  eventId,
}: {
  hasPhoto: boolean;
  photoMode: boolean;
  onMenuAction?: (action: EventCardMenuAction, eventId: string) => void;
  eventId: string;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [showMenu]);

  if (!onMenuAction) return null;

  const menuBtnStyle: React.CSSProperties = photoMode
    ? {
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.18)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
      }
    : {
        width: 28,
        height: 28,
        borderRadius: '50%',
        background: '#F5EDE0',
        border: '1.5px solid var(--cognac-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 2,
      };

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 12px',
    border: 'none',
    background: 'transparent',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    color: '#333',
    cursor: 'pointer',
    textAlign: 'left',
  };

  return (
    <div ref={menuRef} style={{ position: 'relative', zIndex: 5 }}>
      <button
        type="button"
        aria-label="Menu"
        style={menuBtnStyle}
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu((v) => !v);
        }}
      >
        <ThreeDotsIcon color={photoMode ? '#fff' : 'var(--cognac)'} />
      </button>
      {showMenu && (
        <div
          style={{
            position: 'absolute',
            top: 42,
            right: 10,
            background: '#fff',
            border: '1px solid var(--card-border)',
            borderRadius: 12,
            padding: 6,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            zIndex: 10,
            minWidth: 160,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            style={itemStyle}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              onMenuAction('photo', eventId);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--cognac-light)';
              e.currentTarget.style.color = 'var(--cognac)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#333';
            }}
          >
            <span aria-hidden>🖼</span>
            {hasPhoto ? 'Changer la photo' : 'Ajouter une photo'}
          </button>
          <button
            type="button"
            style={itemStyle}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              onMenuAction('edit', eventId);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--cognac-light)';
              e.currentTarget.style.color = 'var(--cognac)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#333';
            }}
          >
            <span aria-hidden>✏️</span>
            Modifier l&apos;événement
          </button>
          <div style={{ height: 1, background: '#F5F0EA', margin: '4px 8px' }} />
          <button
            type="button"
            style={{ ...itemStyle, color: '#E53E3E' }}
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(false);
              onMenuAction('delete', eventId);
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FFF5F5';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <span aria-hidden>🗑</span>
            Supprimer
          </button>
        </div>
      )}
    </div>
  );
}

function PhotoCard({
  event,
  onClick,
  onMenuAction,
}: {
  event: Event;
  onClick?: () => void;
  onMenuAction?: (action: EventCardMenuAction, eventId: string) => void;
}) {
  const count = guestCount(event);
  const meta = `${formatEventDate(event)} · ${count} invité${count !== 1 ? 's' : ''}`;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      style={cardBase}
      className="event-card-hover"
    >
      <img
        src={event.image}
        alt=""
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 12,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <CardMenu hasPhoto photoMode onMenuAction={onMenuAction} eventId={event.id} />
        </div>
        <div>
          <h3
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: '#fff',
              textShadow: '0 1px 8px rgba(0,0,0,0.4)',
              letterSpacing: '-0.4px',
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            {event.title}
          </h3>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', margin: '4px 0 0' }}>{meta}</p>
        </div>
      </div>
    </article>
  );
}

function TextCard({
  event,
  onClick,
  onMenuAction,
}: {
  event: Event;
  onClick?: () => void;
  onMenuAction?: (action: EventCardMenuAction, eventId: string) => void;
}) {
  const guests = event.guests ?? [];
  const visible = guests.slice(0, 3);
  const extra = guests.length - 3;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      style={{ ...cardBase, background: '#fff', display: 'flex', flexDirection: 'column' }}
      className="event-card-hover"
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #F5F0EA',
          position: 'relative',
          padding: '16px 12px 12px',
          textAlign: 'center',
        }}
      >
        <CardMenu hasPhoto={false} photoMode={false} onMenuAction={onMenuAction} eventId={event.id} />
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 14,
            background: 'var(--cognac-light)',
            border: '1.5px solid var(--cognac-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            fontWeight: 800,
            color: 'var(--cognac)',
            marginBottom: 10,
          }}
        >
          {getInitials(event.title)}
        </div>
        <h3
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: 'var(--dark)',
            letterSpacing: '-0.4px',
            margin: '0 0 4px',
            lineHeight: 1.25,
          }}
        >
          {event.title}
        </h3>
        <p style={{ fontSize: 12, color: 'var(--cognac)', fontWeight: 500, margin: 0 }}>
          {formatEventDate(event)}
        </p>
      </div>
      <div
        style={{
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {visible.map((g, i) => (
            <span
              key={g.id}
              title={`${g.firstName} ${g.lastName}`}
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: '#F5EAD8',
                border: '2px solid #fff',
                marginLeft: i === 0 ? 0 : -6,
                fontSize: 9,
                fontWeight: 700,
                color: 'var(--cognac)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: visible.length - i,
              }}
            >
              {guestDisplayName(g)}
            </span>
          ))}
          {extra > 0 && (
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: 'var(--dark)',
                border: '2px solid #fff',
                marginLeft: visible.length > 0 ? -6 : 0,
                fontSize: 9,
                fontWeight: 700,
                color: 'var(--cognac)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              +{extra}
            </span>
          )}
        </div>
        <span
          style={{
            width: 24,
            height: 24,
            borderRadius: '50%',
            background: '#F5EAD8',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
          aria-hidden
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M3 9L9 3M9 3H4M9 3V8"
              stroke="var(--cognac)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </article>
  );
}

export const EventCard: React.FC<EventCardProps> = ({ event, onClick, onMenuAction }) => {
  const hasPhoto = Boolean(event.image?.trim());

  if (hasPhoto) {
    return <PhotoCard event={event} onClick={onClick} onMenuAction={onMenuAction} />;
  }
  return <TextCard event={event} onClick={onClick} onMenuAction={onMenuAction} />;
};
