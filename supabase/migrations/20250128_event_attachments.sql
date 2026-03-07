-- Pièces jointes : documents par événement (optionnellement par sous-événement).
create table if not exists event_attachments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  sub_event_id text,
  name text not null,
  type text not null default 'other',
  url text not null,
  uploaded_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists event_attachments_event_id_idx on event_attachments(event_id);
create index if not exists event_attachments_sub_event_id_idx on event_attachments(sub_event_id);

alter table event_attachments enable row level security;

-- Lecture : créateur ou organisateur confirmé de l'événement (et si sub_event_id, organisateur autorisé sur cette séquence).
create policy "event_attachments_read" on event_attachments
for select using (
  exists (
    select 1 from events e
    where e.id = event_attachments.event_id
      and (
        e.creator_id = auth.uid()
        or exists (
          select 1 from jsonb_array_elements(e.organizers) as org
          where org->>'userId' = auth.uid()::text and org->>'status' = 'confirmed'
          and (
            event_attachments.sub_event_id is null
            or (org->'allowedSubEventIds') is null
            or (org->'allowedSubEventIds') @> to_jsonb(ARRAY[event_attachments.sub_event_id])
          )
        )
      )
  )
);

-- Écriture (insert/update/delete) : même règle.
create policy "event_attachments_insert" on event_attachments
for insert with check (
  exists (
    select 1 from events e
    where e.id = event_attachments.event_id
      and (
        e.creator_id = auth.uid()
        or exists (
          select 1 from jsonb_array_elements(e.organizers) as org
          where org->>'userId' = auth.uid()::text and org->>'status' = 'confirmed'
          and (
            event_attachments.sub_event_id is null
            or (org->'allowedSubEventIds') is null
            or (org->'allowedSubEventIds') @> to_jsonb(ARRAY[event_attachments.sub_event_id])
          )
        )
      )
  )
);

create policy "event_attachments_update" on event_attachments
for update using (
  exists (
    select 1 from events e
    where e.id = event_attachments.event_id
      and (
        e.creator_id = auth.uid()
        or exists (
          select 1 from jsonb_array_elements(e.organizers) as org
          where org->>'userId' = auth.uid()::text and org->>'status' = 'confirmed'
        )
      )
  )
);

create policy "event_attachments_delete" on event_attachments
for delete using (
  exists (
    select 1 from events e
    where e.id = event_attachments.event_id
      and (
        e.creator_id = auth.uid()
        or exists (
          select 1 from jsonb_array_elements(e.organizers) as org
          where org->>'userId' = auth.uid()::text and org->>'status' = 'confirmed'
        )
      )
  )
);
