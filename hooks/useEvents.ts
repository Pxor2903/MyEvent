/**
 * Hook : liste des événements de l’utilisateur + abonnement Realtime (insert/update/delete).
 */
import { useState, useEffect, useRef } from 'react';
import type { Event } from '@/core/types';
import { dbService } from '@/api';
import { supabase } from '@/api';

/**
 * Charge les événements de l’utilisateur et s’abonne aux mises à jour Realtime.
 */
export function useEvents(userId: string) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  const fetchEvents = async () => {
    const list = await dbService.getEventsByUserId(userIdRef.current);
    setEvents(list);
    setLoading(false);
  };

  const fetchEventsRef = useRef(fetchEvents);
  fetchEventsRef.current = fetchEvents;

  useEffect(() => {
    fetchEvents();
  }, [userId]);

  useEffect(() => {
    const channel = supabase
      .channel('home-events-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'events' },
        (payload) => {
          const uid = userIdRef.current;
          const row = payload.new ?? payload.old;
          if (!row) return;
          const isCreator = row.creator_id === uid;
          const organizers = row.organizers ?? [];
          const isOrganizer =
            Array.isArray(organizers) && organizers.some((o: { userId?: string }) => o?.userId === uid);
          if (isCreator || isOrganizer) fetchEventsRef.current();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          fetchEventsRef.current();
        }
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { events, loading, fetchEvents, setEvents };
}
