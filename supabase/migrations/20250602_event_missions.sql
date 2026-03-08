-- Missions / tâches à dispatcher entre organisateurs
alter table events add column if not exists missions jsonb default '[]'::jsonb;
