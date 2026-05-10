import { useState, useEffect } from 'react';
import { getMyProviderProfile } from '@/api/providers';
import type { ProviderProfile } from '@/core/types';

export function useProviderProfile() {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyProviderProfile()
      .then(setProfile)
      .finally(() => setLoading(false));
  }, []);

  return { profile, loading, isApprovedProvider: profile?.status === 'approved' };
}
