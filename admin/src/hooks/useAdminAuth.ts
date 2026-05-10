import { useEffect, useState } from 'react';
import type { AdminUser } from '../types.ts';
import { getSupabaseAdmin } from '../api/admin.ts';

export function useAdminAuth() {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const sb = getSupabaseAdmin();

    const run = async () => {
      const {
        data: { session },
      } = await sb.auth.getSession();
      if (!session?.user) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      const uid = session.user.id;
      const { data: profile } = await sb.from('profiles').select('*').eq('id', uid).maybeSingle();

      if (cancelled) return;

      if (profile && (profile as { role?: string }).role === 'admin') {
        setUser({
          id: uid,
          email: session.user.email ?? '',
          firstName: (profile as { first_name?: string }).first_name ?? '',
          lastName: (profile as { last_name?: string }).last_name ?? '',
          role: 'admin',
        });
      } else {
        await sb.auth.signOut();
        setUser(null);
      }
      setLoading(false);
    };

    void run();

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange(() => {
      void run();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
