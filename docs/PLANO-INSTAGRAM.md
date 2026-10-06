# Plano · Seção de Planejamento do Instagram

Criado em 02/10/2026. Rota `/instagram`, item novo na sidebar.

## Objetivo

Um lugar só para o ciclo inteiro do conteúdo: do formato que funciona, passando pela referência e
pela ideia solta, até o post publicado e quanto ele performou. Toda ideia percorre o mesmo funil e
nunca se perde no caminho.

## Fluxo

```
Modelos ─┐
         ├─► Tempestade ─► Banco (pronta → em produção) ─► Publicado ─► Performou?
Inspirações ┘    (ideia crua)     (ainda não virou post)      (com métricas)
```

Uma ideia é **uma linha só** (`ig_ideas`) e muda de `status`. Isso responde, sem duplicar dado:
- "o que ainda não virou post" = status `brainstorm`, `pronta` ou `producao`
- "o que virou post e performou" = status `publicado` com `performance` `viral` ou `bom`

## Abas

| Aba | O que gerencia | Ações |
|---|---|---|
| **Visão geral** | contadores do funil, top 5 posts por performance, ideias prontas esperando | atalhos para cada aba |
| **Modelos** | formatos principais (Reels, Carrossel, Estático, Stories), estrutura/roteiro-base, link de exemplo, flag "principal" | criar, editar, apagar; ver quantos posts e quantos "performou" cada modelo tem |
| **Inspirações** | link, @perfil, formato, por que chamou atenção, modelo relacionado | criar, editar, apagar; "virar ideia" (cria ideia ligada à inspiração) |
| **Tempestade** | captura rápida: um campo, Enter salva | promover para o banco, apagar |
| **Banco de ideias** | ideias que ainda não viraram post, em duas colunas: Pronta e Em produção | editar (gancho, roteiro, modelo, pilar), mover de coluna, marcar como publicada |
| **Publicados** | posts no ar com data, link e métricas (views, curtidas, comentários, salvos, compartilhamentos, seguidores) e avaliação | filtro "só os que performaram", ordenar por views/salvos/data |

## Dados (Supabase)

SQL em `supabase/instagram.sql`, rodado uma vez no SQL Editor do Supabase.

- `ig_models`: `name`, `format`, `description`, `structure`, `example_url`, `is_main`
- `ig_inspirations`: `title`, `url`, `profile`, `format`, `notes`, `model_id`
- `ig_ideas`: `title`, `hook`, `description`, `status`, `format`, `pillar`, `model_id`,
  `inspiration_id`, `published_at`, `post_url`, `views`, `likes`, `comments`, `saves`, `shares`,
  `follows`, `performance`, `learnings`

`status`: `brainstorm` · `pronta` · `producao` · `publicado`.
`performance`: `viral` · `bom` · `medio` · `fraco` (só para publicados).
Apagar um modelo ou inspiração não apaga as ideias ligadas (`on delete set null`).

## Código

- `app/instagram/page.tsx`: carrega as três tabelas, abas, visão geral
- `app/instagram/_components/`: uma aba por arquivo
- `app/instagram/types.ts`: tipos e rótulos
- `components/Sidebar.tsx`: item "Instagram"
- Segue o padrão das outras páginas: client component, `supabase-js` direto, `Modal` e `showToast`

## Próximos passos possíveis (fora desta entrega)

- Puxar métricas automaticamente da Graph API da Meta
- Calendário editorial (arrastar ideia pronta para um dia)
- Upload de print/thumbnail da inspiração

## Acesso de outras sessões (06/10/2026)

- **Consultar os próximos posts:** `node scripts/proximos-posts.mjs` (`--completo` inclui gancho e
  roteiro). Só lê, na ordem do Banco de ideias: em produção, Gravar agora, Próximas, Depois.
- **Credenciais:** `.env.local` deste projeto (`NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Fica fora do git; ler do arquivo, nunca copiar o valor.
- **Prioridade:** `ig_ideas.priority` (1 gravar agora, 2 próximas, 3 depois) e `sort_order`
  (ordem manual dentro da faixa). SQL em `supabase/ig_prioridade.sql`.
- **Banco de ganchos** (06/10/2026): aba Modelos, tabela `ig_hooks` (`text`, `category`, `profile`,
  `url`, `notes`). SQL em `supabase/ig_ganchos.sql`. "Virar ideia" cria uma ideia na Tempestade
  com o gancho preenchido.
