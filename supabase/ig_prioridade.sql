-- Prioridade e ordem manual das ideias prontas · rodar uma vez no SQL Editor do Supabase.
-- priority: 1 = gravar agora, 2 = próximas, 3 = depois.

alter table ig_ideas add column if not exists priority smallint not null default 2;
alter table ig_ideas add column if not exists sort_order integer;

alter table ig_ideas drop constraint if exists ig_ideas_priority_check;
alter table ig_ideas add constraint ig_ideas_priority_check check (priority between 1 and 3);
