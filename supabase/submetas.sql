-- Submetas: um objetivo pode ter objetivos-filho · rodar uma vez no SQL Editor do Supabase.
-- Apagar a meta apaga as submetas dela.

alter table year_goals add column if not exists parent_id uuid references year_goals(id) on delete cascade;
create index if not exists year_goals_parent_idx on year_goals (parent_id);
