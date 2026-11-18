# Conteúdo · esteira de produção (YouTube, Instagram, LinkedIn)

Criado em 18/11/2026, a pedido dele: *"prezar sempre por clareza"* e *"trabalhar no modelo de esteira,
pensando que vídeos do YT vão ser úteis para postar no Instagram"*.

**A tela mora no CRM** (`workflow-crm`, decisão dele em 18/11), não neste app. Ficou aqui por algumas
horas e foi retirada no mesmo dia. Deste repositório ficam só os scripts abaixo e o SQL. A aba
Instagram deste app volta a ser a de antes; as ideias dela já foram importadas para a esteira.

## Definições

- **Peça:** tudo o que vai ao ar numa plataforma (Reels, Short, vídeo longo, carrossel, post no LinkedIn).
- **Peça-mãe:** a peça gravada de onde saem outras. Em geral o vídeo do YouTube.
- **Corte:** a peça que sai da peça-mãe, adaptada a uma plataforma (`mae_id` preenchido).
- **Referência:** link de fora que serve de base para uma peça. Não existe "inspiração" separada.

## Esteira

**Ideia → Para gravar → Para editar → Para postar → Publicado.** Só vídeo passa por Para gravar.
Corte nasce em Para editar. **Teto: 5 peças em Para editar.** LinkedIn é linha própria: corte só vai
para lá quando ele disser. Nada é publicado pelo sistema.

## Abas (no CRM)

Esteira (quadro) · Gravar (agrupado pelo jeito de gravar) · Calendário · Publicado (dois números por
plataforma: Instagram views e seguidores ganhos; YouTube views e inscritos ganhos; LinkedIn
impressões e comentários).

## Dados

Uma tabela, `cnt_pecas` (SQL em `supabase/conteudo.sql`), no **Supabase da Workflow** (o mesmo do CRM
e da automação; decisão dele em 18/11/2026), não no banco do sistema de gestão. A tabela é fechada para a
chave pública (só a chave secreta, no servidor, lê e grava). Os scripts leem a chave do `.env.local`
do CRM no `conteudo-os`, sem copiar o valor. Briefing só em texto: gancho, roteiro,
CTA, referência. Nada de instrução de produção ou caminho de arquivo; isso mora no repositório
`conteudo-os`.

## Scripts

- `node scripts/proximos-posts.mjs [--completo]`: lê a esteira (só leitura). É o que as outras sessões usam.
- `node scripts/importar-conteudo.mjs [--simular]`: trouxe as ideias da aba Instagram (uma vez; não
  sobrescreve) e sincroniza a fila do LinkedIn (`queue.json`), que manda na publicação de lá.
