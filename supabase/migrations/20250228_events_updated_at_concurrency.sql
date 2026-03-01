-- Verrouillage optimiste : s'assurer que updated_at existe et est mis à jour à chaque modification.
-- Permet d'éviter les écrasements quand plusieurs utilisateurs modifient l'événement en même temps.

alter table events add column if not exists updated_at timestamptz not null default now();

-- Mettre à jour les lignes existantes qui auraient un vieux default
update events set updated_at = coalesce(updated_at, now()) where updated_at is null;

-- Trigger pour rafraîchir updated_at à chaque UPDATE (sécurité supplémentaire)
create or replace function events_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists events_updated_at_trigger on events;
create trigger events_updated_at_trigger
  before update on events
  for each row
  execute function events_set_updated_at();
