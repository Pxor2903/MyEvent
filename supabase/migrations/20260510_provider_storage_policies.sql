-- Politique pour les photos prestataires (publiques)
INSERT INTO storage.policies (name, bucket_id, operation, definition)
VALUES (
  'Provider photos are public',
  'event-files',
  'SELECT',
  'true'
) ON CONFLICT DO NOTHING;

-- Les prestataires authentifiés peuvent uploader leurs photos
INSERT INTO storage.policies (name, bucket_id, operation, definition, check_expression)
VALUES (
  'Providers can upload their photos',
  'event-files',
  'INSERT',
  'auth.role() = ''authenticated''',
  '(storage.foldername(name))[1] = ''provider-photos'''
) ON CONFLICT DO NOTHING;

-- Les prestataires authentifiés peuvent uploader leurs documents
INSERT INTO storage.policies (name, bucket_id, operation, definition, check_expression)
VALUES (
  'Providers can upload their documents',
  'event-files',
  'INSERT',
  'auth.role() = ''authenticated''',
  '(storage.foldername(name))[1] = ''provider-docs'''
) ON CONFLICT DO NOTHING;
