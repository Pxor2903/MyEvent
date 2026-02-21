import React from 'react';
import type { Event } from '@/core/types';

interface EventCardProps {
  event: Event;
  compact?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({ event, compact }) => {
  const dateValue = event.startDate || event.date;
  const eventDate = dateValue ? new Date(dateValue) : null;
  const isPast = eventDate ? eventDate < new Date() : false;

  return (
    <article
      className={`
        bg-white rounded-2xl border border-slate-200 overflow-hidden
        transition-all duration-200 hover:shadow-lg hover:border-slate-300 active:scale-[0.99]
        ${compact ? 'flex gap-3 p-3' : 'flex flex-col'}
      `}
    >
      <div className={`${compact ? 'w-20 h-20 rounded-xl' : 'w-full h-36'} flex-shrink-0 relative overflow-hidden`}>
        <img
          src={event.image || `https://picsum.photos/seed/${event.id}/400/300`}
          className="w-full h-full object-cover"
          alt=""
        />
        <span
          className={`absolute top-2 right-2 text-[10px] font-semibold px-2 py-1 rounded-lg ${
            isPast ? 'bg-slate-200/90 text-slate-600' : 'bg-indigo-600 text-white'
          }`}
        >
          {event.category}
        </span>
      </div>
      <div className={`flex-1 ${compact ? 'py-0 flex flex-col justify-center' : 'p-4'}`}>
        <h3 className={`font-semibold text-slate-900 ${compact ? 'text-sm line-clamp-1' : 'text-base mb-1'}`}>
          {event.title}
        </h3>
        <p className="text-slate-500 text-xs flex items-center gap-1.5">
          {eventDate
            ? eventDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
            : 'À confirmer'}
        </p>
        {!compact && (
          <>
            {event.description && (
              <p className="text-sm text-slate-500 line-clamp-2 mt-2">{event.description}</p>
            )}
            {event.location && (
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5 truncate">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                </svg>
                {event.location}
              </p>
            )}
          </>
        )}
      </div>
    </article>
  );
};
