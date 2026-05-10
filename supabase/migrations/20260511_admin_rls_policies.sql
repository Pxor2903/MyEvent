-- Permet à l'admin de tout lire dans profiles
CREATE POLICY "Admin peut lire tous les profils" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Permet à l'admin de tout lire dans events  
CREATE POLICY "Admin peut lire tous les événements" ON public.events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Permet à l'admin de modifier provider_profiles
CREATE POLICY "Admin peut tout faire sur provider_profiles" ON public.provider_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
