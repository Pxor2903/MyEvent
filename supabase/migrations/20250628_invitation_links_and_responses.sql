-- Liens uniques pour que les invités puissent répondre à une invitation (par événement + invité).
-- Un token = un lien de réponse pour un invité donné.
create table if not exists invitation_links (
  id uuid primary key default gen_random_uuid(),
  token uuid not null default gen_random_uuid() unique,
  event_id uuid not null references events(id) on delete cascade,
  guest_id uuid not null,
  created_at timestamptz not null default now(),
  unique(event_id, guest_id)
);

create index if not exists invitation_links_token_idx on invitation_links(token);
create index if not exists invitation_links_event_guest_idx on invitation_links(event_id, guest_id);

comment on table invitation_links is 'Lien unique par invité pour répondre à une invitation (réponse présence / nombre de personnes).';

-- Réponses enregistrées (historique + mise à jour du statut invité dans events.guests).
create table if not exists invitation_responses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  guest_id uuid not null,
  confirmed boolean not null,
  guest_count integer not null default 1,
  message text,
  responded_at timestamptz not null default now(),
  unique(event_id, guest_id)
);

create index if not exists invitation_responses_event_id_idx on invitation_responses(event_id);

comment on table invitation_responses is 'Réponses des invités (présence, nombre de personnes). Une réponse par invité ; la mise à jour du guest dans events.guests est faite côté API.';

-- RLS : invitation_links
alter table invitation_links enable row level security;

-- Lecture / écriture : créateur ou organisateur confirmé de l’événement
create policy "invitation_links_select" on invitation_links
  for select using (
    exists (
      select 1 from events e
      where e.id = invitation_links.event_id
        and (e.creator_id = auth.uid()
             or exists (
               select 1 from jsonb_array_elements(e.organizers) as org
               where (org->>'userId') = auth.uid()::text
                 and (org->>'status') = 'confirmed'
             ))
    )
  );

create policy "invitation_links_insert" on invitation_links
  for insert with check (
    exists (
      select 1 from events e
      where e.id = invitation_links.event_id
        and (e.creator_id = auth.uid()
             or exists (
               select 1 from jsonb_array_elements(e.organizers) as org
               where (org->>'userId') = auth.uid()::text
                 and (org->>'status') = 'confirmed'
             ))
    )
  );

-- RLS : invitation_responses (lecture seule pour les organisateurs ; l’écriture se fait via l’API serverless avec service role)
alter table invitation_responses enable row level security;

create policy "invitation_responses_select" on invitation_responses
  for select using (
    exists (
      select 1 from events e
      where e.id = invitation_responses.event_id
        and (e.creator_id = auth.uid()
             or exists (
               select 1 from jsonb_array_elements(e.organizers) as org
               where (org->>'userId') = auth.uid()::text
                 and (org->>'status') = 'confirmed'
             ))
    )
  );
