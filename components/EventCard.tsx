import React from 'react';
import { Event } from '../types';

interface EventCardProps {
  event: Event;
  compact?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({ event, compact }) => {
  const dateValue = event.startDate || event.date;
  const eventDate = dateValue ? new Date(dateValue) : null;
  const isPast = eventDate ? eventDate < new Date() : false;

  return (
    <div className={`
      bg-white rounded-xl border border-slate-200 overflow-hidden
      transition-shadow hover:shadow-md
      ${compact ? 'flex gap-3 p-3' : 'flex flex-col'}
    `}>
      <div className={`${compact ? 'w-20 h-20' : 'w-full h-36'} flex-shrink-0 relative overflow-hidden`}>
        <img
          src={event.image || `https://picsum.photos/seed/${event.id}/400/300`}
          className="w-full h-full object-cover"
          alt=""
        />
        <span className={`absolute top-2 right-2 text-[10px] font-medium px-2 py-0.5 rounded-md ${isPast ? 'bg-slate-200 text-slate-600' : 'bg-indigo-600 text-white'}`}>
          {event.category}
        </span>
      </div>
      <div className={`flex-1 ${compact ? 'py-0' : 'p-4'}`}>
        <h3 className={`font-semibold text-slate-900 ${compact ? 'text-sm line-clamp-1' : 'text-base mb-1'}`}>
          {event.title}
        </h3>
        <p className="text-slate-500 text-xs flex items-center gap-1.5">
          <span>{eventDate ? eventDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'À confirmer'}</span>
        </p>
        {!compact && (
          <>
            {event.description && <p className="text-sm text-slate-500 line-clamp-2 mt-1">{event.description}</p>}
            {event.location && (
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1 truncate">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                {event.location}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
