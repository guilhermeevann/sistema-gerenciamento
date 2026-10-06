-- Banco de ganchos (aba Modelos) · rodar uma vez no SQL Editor do Supabase.

create table if not exists ig_hooks (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  category text,
  profile text,
  url text,
  notes text,
  created_at timestamptz not null default now()
);

-- Mesmo acesso das demais tabelas do app (cliente usa a anon key).
alter table ig_hooks enable row level security;
drop policy if exists "ig_hooks_all" on ig_hooks;
create policy "ig_hooks_all" on ig_hooks for all using (true) with check (true);
