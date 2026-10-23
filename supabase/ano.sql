-- Planejamento anual (visão, objetivos, resultados-chave, alavancas, revisões)
-- Rodar uma vez no SQL Editor do Supabase.

create table if not exists year_plans (
  year integer primary key,
  word text,          -- palavra / versículo do ano
  vision text,        -- como quero estar no fim do ano
  anti_goals text,    -- o que não vou fazer
  created_at timestamptz not null default now()
);

create table if not exists year_goals (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  title text not null,
  area text not null default 'negocio'
    check (area in ('espiritual', 'familia', 'saude', 'financas', 'negocio', 'desenvolvimento')),
  why text,           -- por que importa
  quarter smallint check (quarter between 1 and 4),  -- trimestre do prazo
  obstacle text,      -- WOOP: o obstáculo provável
  if_then text,       -- WOOP: se acontecer X, eu faço Y
  status text not null default 'ativo' check (status in ('ativo', 'concluido', 'pausado')),
  sort_order integer,
  created_at timestamptz not null default now()
);

create table if not exists year_measures (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references year_goals(id) on delete cascade,
  kind text not null default 'resultado' check (kind in ('resultado', 'alavanca')),
  title text not null,
  unit text,               -- R$, clientes, kg...
  start_value numeric,     -- resultado: de onde parte
  target_value numeric,    -- resultado: aonde quer chegar
  current_value numeric,   -- resultado: onde está agora
  frequency text,          -- alavanca: "2x por semana", "todo dia"...
  quarter smallint check (quarter between 1 and 4),
  created_at timestamptz not null default now()
);

create table if not exists year_reviews (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  quarter smallint not null check (quarter between 1 and 4),
  score smallint check (score between 1 and 10),
  worked text,
  adjust text,
  created_at timestamptz not null default now(),
  unique (year, quarter)
);

create index if not exists year_goals_year_idx on year_goals (year);
create index if not exists year_measures_goal_idx on year_measures (goal_id);

-- Mesmo acesso das demais tabelas do app (cliente usa a anon key).
alter table year_plans enable row level security;
alter table year_goals enable row level security;
alter table year_measures enable row level security;
alter table year_reviews enable row level security;

drop policy if exists "year_plans_all" on year_plans;
drop policy if exists "year_goals_all" on year_goals;
drop policy if exists "year_measures_all" on year_measures;
drop policy if exists "year_reviews_all" on year_reviews;

create policy "year_plans_all" on year_plans for all using (true) with check (true);
create policy "year_goals_all" on year_goals for all using (true) with check (true);
create policy "year_measures_all" on year_measures for all using (true) with check (true);
create policy "year_reviews_all" on year_reviews for all using (true) with check (true);
