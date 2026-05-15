-- Évite la récursion RLS : les policies admin testent le rôle via une fonction SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;

DROP POLICY IF EXISTS "Admin peut lire tous les profils" ON public.profiles;
CREATE POLICY "Admin peut lire tous les profils" ON public.profiles
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admin peut lire tous les événements" ON public.events;
CREATE POLICY "Admin peut lire tous les événements" ON public.events
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Admin peut tout faire sur provider_profiles" ON public.provider_profiles;
CREATE POLICY "Admin peut tout faire sur provider_profiles" ON public.provider_profiles
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins voient les actions" ON public.admin_actions;
CREATE POLICY "Admins voient les actions" ON public.admin_actions
  FOR SELECT USING (public.is_admin());
