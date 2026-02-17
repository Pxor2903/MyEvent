create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  first_name text not null,
  last_name text not null,
  phone text,
  street text,
  city text,
  zip_code text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key,
  share_code text not null unique,
  share_password text not null default '',
  title text not null,
  description text,
  start_date timestamptz,
  end_date timestamptz,
  is_period boolean not null default false,
  is_date_tbd boolean not null default false,
  location text not null,
  image text,
  creator_id uuid not null references profiles(id) on delete cascade,
  organizers jsonb not null default '[]'::jsonb,
  category text not null,
  general_guests_count integer not null default 0,
  budget numeric not null default 0,
  sub_events jsonb not null default '[]'::jsonb,
  guests jsonb not null default '[]'::jsonb,
  is_guest_chat_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_creator_id_idx on events(creator_id);
create unique index if not exists events_share_code_unique on events(share_code);
create index if not exists events_organizers_idx on events using gin(organizers);

create table if not exists chat_messages (
  id uuid primary key,
  event_id uuid not null references events(id) on delete cascade,
  channel_id text not null,
  sender_id uuid not null references profiles(id) on delete cascade,
  sender_name text not null,
  text text not null,
  role text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_event_id_idx on chat_messages(event_id);
create index if not exists chat_messages_channel_id_idx on chat_messages(channel_id);

alter table profiles enable row level security;
alter table events enable row level security;
alter table chat_messages enable row level security;

create policy "profiles_read_own" on profiles
for select using (auth.uid() = id);

create policy "profiles_upsert_own" on profiles
for insert with check (auth.uid() = id);

create policy "profiles_update_own" on profiles
for update using (auth.uid() = id);

create policy "events_read" on events
for select using (
  auth.uid() = creator_id
  or exists (
    select 1
    from jsonb_array_elements(organizers) as org
    where org->>'userId' = auth.uid()::text
      and org->>'status' = 'confirmed'
  )
);

create policy "events_write_creator" on events
for insert with check (auth.uid() = creator_id);

create policy "events_update_allowed" on events
for update using (
  auth.uid() = creator_id
  or exists (
    select 1
    from jsonb_array_elements(organizers) as org
    where org->>'userId' = auth.uid()::text
      and org->>'status' = 'confirmed'
  )
);

create policy "messages_read_event_members" on chat_messages
for select using (
  exists (
    select 1
    from events
    where events.id = chat_messages.event_id
      and (
        events.creator_id = auth.uid()
        or exists (
          select 1
          from jsonb_array_elements(events.organizers) as org
          where org->>'userId' = auth.uid()::text
            and org->>'status' = 'confirmed'
        )
      )
  )
);

create policy "messages_insert_event_members" on chat_messages
for insert with check (
  exists (
    select 1
    from events
    where events.id = chat_messages.event_id
      and (
        events.creator_id = auth.uid()
        or exists (
          select 1
          from jsonb_array_elements(events.organizers) as org
          where org->>'userId' = auth.uid()::text
            and org->>'status' = 'confirmed'
        )
      )
  )
);
