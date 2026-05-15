-- Métriques admin (auth.users + agrégats events) — réservé aux admins connectés.
CREATE OR REPLACE FUNCTION public.get_admin_platform_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Accès refusé : admin requis';
  END IF;

  RETURN jsonb_build_object(
    'totalUsers', (SELECT COUNT(*)::int FROM public.profiles),
    'totalProviders', (SELECT COUNT(*)::int FROM public.provider_profiles),
    'pendingProviders', (SELECT COUNT(*)::int FROM public.provider_profiles WHERE status = 'pending'),
    'approvedProviders', (SELECT COUNT(*)::int FROM public.provider_profiles WHERE status = 'approved'),
    'totalEvents', (SELECT COUNT(*)::int FROM public.events),
    'usersActiveThisMonth', (
      SELECT COUNT(*)::int
      FROM auth.users
      WHERE last_sign_in_at > NOW() - INTERVAL '30 days'
    ),
    'eventsActive', (
      SELECT COUNT(*)::int
      FROM public.events e
      WHERE e.end_date > NOW()
        OR (e.end_date IS NULL AND e.start_date > NOW() - INTERVAL '30 days')
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(COALESCE(e.sub_events, '[]'::jsonb)) AS se
          WHERE NULLIF(TRIM(se->>'date'), '') IS NOT NULL
            AND (se->>'date')::timestamptz > NOW()
        )
    ),
    'usersWithEvents', (
      SELECT COUNT(DISTINCT creator_id)::int FROM public.events
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_platform_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_platform_stats() TO anon;
