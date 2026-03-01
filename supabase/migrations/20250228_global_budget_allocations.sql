-- Frais globaux (pour tout l'événement, hors sous-événements)
alter table events add column if not exists global_budget_allocations jsonb default '[]'::jsonb;
