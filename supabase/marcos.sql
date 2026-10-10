-- Linha do tempo de marcos · rodar uma vez no SQL Editor do Supabase.

create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  -- true = "início/meados/fim do mês" em vez do dia exato
  approximate boolean not null default false,
  kind text not null default 'pessoal'
    check (kind in ('trabalho', 'pessoal', 'mudanca', 'viagem', 'data')),
  notes text,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists milestones_date_idx on milestones (date);

-- Mesmo acesso das demais tabelas do app (cliente usa a anon key).
alter table milestones enable row level security;
drop policy if exists "milestones_all" on milestones;
create policy "milestones_all" on milestones for all using (true) with check (true);
