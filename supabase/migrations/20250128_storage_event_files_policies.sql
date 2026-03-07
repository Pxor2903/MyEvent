-- Policies Storage pour le bucket event-files (documents des événements).
-- À exécuter après avoir créé le bucket "event-files" dans le dashboard (Storage → New bucket).

-- Autoriser les utilisateurs connectés à déposer des fichiers dans event-files.
create policy "event-files allow authenticated upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'event-files');

-- Autoriser la lecture des fichiers (nécessaire pour les liens publics et le téléchargement).
create policy "event-files allow public read"
on storage.objects for select
to public
using (bucket_id = 'event-files');

-- Autoriser les utilisateurs connectés à supprimer (pour la suppression de pièces jointes).
create policy "event-files allow authenticated delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'event-files');
