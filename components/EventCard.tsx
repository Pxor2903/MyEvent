
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
      bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all group
      ${compact ? 'flex gap-4 p-3' : 'flex flex-col'}
    `}>
      <div className={`${compact ? 'w-24 h-24' : 'w-full h-40'} relative overflow-hidden flex-shrink-0`}>
        <img 
          src={event.image || `https://picsum.photos/seed/${event.id}/400/300`} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
          alt={event.title} 
        />
        <div className="absolute top-2 right-2">
          <span className={`
            text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider backdrop-blur-md
            ${isPast ? 'bg-gray-100/80 text-gray-600' : 'bg-indigo-600/80 text-white'}
          `}>
            {event.category}
          </span>
        </div>
      </div>

      <div className={`flex-1 ${compact ? 'py-1 pr-2' : 'p-4'}`}>
        <h4 className={`font-bold text-gray-900 group-hover:text-indigo-600 transition-colors ${compact ? 'text-sm line-clamp-1' : 'text-lg mb-1'}`}>
          {event.title}
        </h4>
        <div className="flex items-center gap-2 text-gray-500 text-xs mb-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          {eventDate
            ? eventDate.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
            : 'À confirmer'}
        </div>
        {!compact && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-4">
            {event.description}
          </p>
        )}
        <div className="flex items-center gap-2 text-gray-400 text-xs">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span className="line-clamp-1">{event.location}</span>
        </div>
      </div>
    </div>
  );
};
