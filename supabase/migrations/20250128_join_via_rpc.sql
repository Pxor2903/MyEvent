-- Permettre à un autre compte de rejoindre un événement (contourne RLS pour la recherche par clé + mdp et l'ajout en pending).

-- Retourne l'id de l'événement si la clé et le mot de passe correspondent.
create or replace function get_event_id_for_join(p_share_code text, p_share_password text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from events
  where share_code = trim(upper(p_share_code))
    and trim(share_password) = trim(p_share_password)
  limit 1;
$$;

-- Ajoute l'utilisateur connecté (auth.uid()) comme organisateur "pending" à l'événement.
create or replace function add_pending_organizer(p_event_id uuid, p_first_name text, p_last_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_organizers jsonb;
  v_new_organizer jsonb;
begin
  if v_uid is null then
    raise exception 'Non authentifié';
  end if;

  select organizers into v_organizers
  from events
  where id = p_event_id and creator_id <> v_uid
  limit 1;

  if v_organizers is null then
    raise exception 'Événement introuvable ou vous en êtes le créateur';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_organizers) as o
    where (o->>'userId') = v_uid::text
  ) then
    return; -- déjà dans la liste
  end if;

  v_new_organizer := jsonb_build_object(
    'userId', v_uid::text,
    'firstName', coalesce(trim(p_first_name), ''),
    'lastName', coalesce(trim(p_last_name), ''),
    'status', 'pending',
    'permissions', to_jsonb(ARRAY['access_organizer_chat']::text[])
  );

  update events
  set organizers = organizers || v_new_organizer
  where id = p_event_id;
end;
$$;

grant execute on function get_event_id_for_join(text, text) to anon;
grant execute on function get_event_id_for_join(text, text) to authenticated;
grant execute on function add_pending_organizer(uuid, text, text) to anon;
grant execute on function add_pending_organizer(uuid, text, text) to authenticated;
