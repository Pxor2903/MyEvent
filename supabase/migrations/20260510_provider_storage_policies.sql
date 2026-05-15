-- Photos prestataires (publiques en lecture)
CREATE POLICY "Provider photos publiques" ON storage.objects
  FOR SELECT USING (bucket_id = 'event-files' AND (storage.foldername(name))[1] = 'provider-photos');

-- Upload photos prestataires (authentifié)
CREATE POLICY "Providers uploadent leurs photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'event-files'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'provider-photos'
  );

-- Upload documents justificatifs (authentifié)
CREATE POLICY "Providers uploadent leurs documents" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'event-files'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'provider-docs'
  );

-- Lecture documents justificatifs (owner uniquement)
CREATE POLICY "Providers lisent leurs documents" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'event-files'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = 'provider-docs'
  );