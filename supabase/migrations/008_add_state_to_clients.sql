-- Migration 008: add state column to clients table
-- The clients table was missing the state/department field that the
-- registration and profile screens both write and read.

alter table clients
  add column if not exists state text;

-- Back-fill existing rows that have no state yet (leave as empty string
-- so NOT NULL constraints are not needed — callers handle the blank case).
update clients set state = '' where state is null;
