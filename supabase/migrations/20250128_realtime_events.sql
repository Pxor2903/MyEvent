-- Activer Realtime pour les mises à jour en direct (sans recharger la page).
-- events : équipe, invités, programme, réglages…
-- chat_messages : messagerie équipe (chaque envoi est reçu en direct par les autres)
-- Idempotent : peut être exécuté plusieurs fois sans erreur.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'events') then
    alter publication supabase_realtime add table events;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'chat_messages') then
    alter publication supabase_realtime add table chat_messages;
  end if;
end $$;
