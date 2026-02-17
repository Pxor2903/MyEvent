-- Migration: add share_password and unique share_code for existing DBs
-- Run this if your events table was created before these changes.

alter table events add column if not exists share_password text not null default '';
create unique index if not exists events_share_code_unique on events(share_code);
