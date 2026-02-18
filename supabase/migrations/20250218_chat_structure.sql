-- Structure messagerie type "conversation" : index performants + résumé par canal (dernière phrase, date)
-- pour pouvoir lister les canaux avec aperçu sans scanner toutes les lignes.

-- Index composite pour les requêtes par (event, canal) triées par date (pagination / scroll)
create index if not exists chat_messages_event_channel_created_idx
  on chat_messages (event_id, channel_id, created_at desc);

-- Table de résumé par canal : dernière activité et aperçu (comme liste de conversations)
create table if not exists chat_channels (
  event_id uuid not null references events(id) on delete cascade,
  channel_id text not null,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  primary key (event_id, channel_id)
);

create index if not exists chat_channels_event_id_idx on chat_channels(event_id);
create index if not exists chat_channels_last_message_at_idx on chat_channels(last_message_at desc);

alter table chat_channels enable row level security;

-- RLS : même règle que pour lire les events (membres du projet)
create policy "chat_channels_read_event_members" on chat_channels
for select using (
  exists (
    select 1 from events
    where events.id = chat_channels.event_id
      and (
        events.creator_id = auth.uid()
        or exists (
          select 1 from jsonb_array_elements(events.organizers) as org
          where org->>'userId' = auth.uid()::text and org->>'status' = 'confirmed'
        )
      )
  )
);

-- Trigger : à chaque nouveau message, mettre à jour le résumé du canal
create or replace function chat_channels_upsert_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into chat_channels (event_id, channel_id, last_message_at, last_message_preview)
  values (
    new.event_id,
    new.channel_id,
    new.created_at,
    left(trim(new.text), 100)
  )
  on conflict (event_id, channel_id) do update set
    last_message_at = new.created_at,
    last_message_preview = left(trim(new.text), 100);
  return new;
end;
$$;

drop trigger if exists chat_messages_after_insert on chat_messages;
create trigger chat_messages_after_insert
  after insert on chat_messages
  for each row
  execute function chat_channels_upsert_on_message();

-- Remplir chat_channels pour les messages déjà existants (dernier message par canal)
insert into chat_channels (event_id, channel_id, last_message_at, last_message_preview)
select distinct on (event_id, channel_id) event_id, channel_id, created_at, left(trim(text), 100)
from chat_messages
order by event_id, channel_id, created_at desc
on conflict (event_id, channel_id) do update set
  last_message_at = excluded.last_message_at,
  last_message_preview = excluded.last_message_preview;
