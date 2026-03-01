-- Budget: devise et répartition par sous-événement
alter table events add column if not exists currency text default 'EUR';
alter table events add column if not exists sub_event_budgets jsonb default '{}'::jsonb;
