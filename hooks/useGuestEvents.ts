import { useEffect, useState } from 'react';
import type { Event, User } from '@/core/types';
import { dbService } from '@/api';

export function useGuestEvents(user: User) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGuestEvents = async () => {
    setLoading(true);
    try {
      const list = await dbService.getGuestEventsByUser(user);
      setEvents(list ?? []);
    } catch (e) {
      console.error('[useGuestEvents] failed:', e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchGuestEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, user.email, user.phone]);

  return { events, loading, fetchGuestEvents, setEvents };
}

