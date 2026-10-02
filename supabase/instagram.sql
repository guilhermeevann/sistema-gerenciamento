-- Seção Instagram · rodar uma vez no SQL Editor do Supabase.

create table if not exists ig_models (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  format text not null default 'reels',
  description text,
  structure text,
  example_url text,
  is_main boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists ig_inspirations (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text,
  profile text,
  format text not null default 'reels',
  notes text,
  model_id uuid references ig_models(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists ig_ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  hook text,
  description text,
  status text not null default 'brainstorm'
    check (status in ('brainstorm', 'pronta', 'producao', 'publicado')),
  format text,
  pillar text,
  model_id uuid references ig_models(id) on delete set null,
  inspiration_id uuid references ig_inspirations(id) on delete set null,
  published_at date,
  post_url text,
  views integer,
  likes integer,
  comments integer,
  saves integer,
  shares integer,
  follows integer,
  performance text check (performance in ('viral', 'bom', 'medio', 'fraco')),
  learnings text,
  created_at timestamptz not null default now()
);

create index if not exists ig_ideas_status_idx on ig_ideas (status);

-- Mesmo acesso das demais tabelas do app (cliente usa a anon key).
alter table ig_models enable row level security;
alter table ig_inspirations enable row level security;
alter table ig_ideas enable row level security;

drop policy if exists "ig_models_all" on ig_models;
drop policy if exists "ig_inspirations_all" on ig_inspirations;
drop policy if exists "ig_ideas_all" on ig_ideas;

create policy "ig_models_all" on ig_models for all using (true) with check (true);
create policy "ig_inspirations_all" on ig_inspirations for all using (true) with check (true);
create policy "ig_ideas_all" on ig_ideas for all using (true) with check (true);
