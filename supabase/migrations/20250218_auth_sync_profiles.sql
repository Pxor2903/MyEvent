-- Lien auth.users ↔ public.profiles : à chaque nouvel utilisateur Auth, créer sa ligne dans profiles.
-- Comme ça, même si l’app n’a pas encore fait l’upsert, le profil existe en base.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fn text;
  ln text;
  full_name_val text;
  parts text[];
begin
  fn := coalesce(
    nullif(trim(new.raw_user_meta_data->>'first_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'given_name'), '')
  );
  ln := coalesce(
    nullif(trim(new.raw_user_meta_data->>'last_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'family_name'), '')
  );
  full_name_val := nullif(trim(new.raw_user_meta_data->>'full_name'), '');
  if full_name_val is not null and (fn is null or ln is null) then
    parts := string_to_array(full_name_val, ' ');
    if fn is null then fn := coalesce(parts[1], 'Utilisateur'); end if;
    if ln is null then ln := coalesce(array_to_string(parts[2:], ' '), ''); end if;
  end if;
  fn := coalesce(fn, 'Utilisateur');
  ln := coalesce(ln, '');

  insert into public.profiles (id, email, first_name, last_name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    fn,
    ln,
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, profiles.email),
    first_name = coalesce(nullif(trim(excluded.first_name), ''), profiles.first_name),
    last_name = coalesce(excluded.last_name, profiles.last_name),
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();

-- Optionnel : remplir profiles pour les utilisateurs Auth qui n’ont pas encore de ligne
insert into public.profiles (id, email, first_name, last_name, avatar_url)
select
  u.id,
  coalesce(u.email, ''),
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'first_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'given_name'), ''),
    coalesce((string_to_array(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), ' '))[1], 'Utilisateur')
  ),
  coalesce(
    nullif(trim(u.raw_user_meta_data->>'last_name'), ''),
    nullif(trim(u.raw_user_meta_data->>'family_name'), ''),
    coalesce(array_to_string((string_to_array(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), ' '))[2:], ' '), '')
  ),
  u.raw_user_meta_data->>'avatar_url'
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
