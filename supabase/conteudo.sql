-- Conteúdo · esteira de produção (YouTube, Instagram, LinkedIn).
-- Mora no Supabase da Workflow (o mesmo do CRM e da automação), decisão dele em 18/11/2026.
-- Pode rodar de novo sem estragar nada.
-- Acesso só pelo servidor do app (rotas /api/conteudo, com a chave secreta): a chave pública
-- deste projeto NÃO lê nem grava esta tabela.
--
-- Uma tabela só. Cada linha é uma PEÇA: tudo o que vai ao ar numa plataforma.
-- Peça com mae_id preenchido é um CORTE da peça-mãe (em geral um vídeo do YouTube).

create table if not exists cnt_pecas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  plataforma text check (plataforma in ('youtube', 'instagram', 'linkedin')),
  formato text check (formato in ('video_longo', 'video_curto', 'carrossel', 'imagem', 'texto')),
  etapa text not null default 'ideia'
    check (etapa in ('ideia', 'gravar', 'editar', 'postar', 'publicado')),
  mae_id uuid references cnt_pecas(id) on delete set null,

  -- Briefing: só texto.
  gancho text,
  roteiro text,
  cta text,
  referencia text,
  gravacao text check (gravacao in ('camera', 'fundo', 'rapido')),
  prioridade smallint not null default 2 check (prioridade in (1, 2, 3)),
  ordem integer,

  -- Data em que vai ao ar (prevista até publicar, a real depois).
  data date,
  link text,
  -- Dois números depois de publicar. O nome de cada um depende da plataforma.
  numero1 integer,
  numero2 integer,

  -- De onde a peça foi importada (para a importação não duplicar).
  origem text unique,
  created_at timestamptz not null default now()
);

create index if not exists cnt_pecas_etapa_idx on cnt_pecas (etapa);
create index if not exists cnt_pecas_mae_idx on cnt_pecas (mae_id);

-- Fechada para a chave pública: RLS ligado, nenhuma política, e sem permissão para anon/authenticated.
alter table cnt_pecas enable row level security;
drop policy if exists "cnt_pecas_all" on cnt_pecas;
revoke all on cnt_pecas from anon, authenticated;
