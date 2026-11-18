// Leva para a esteira de Conteúdo (tabela cnt_pecas) o que já existe:
//   1. as ideias da antiga aba Instagram (ig_ideas), uma vez só: peça já importada não é sobrescrita;
//   2. a fila do LinkedIn (queue.json do linkedin-publisher): a fila manda na publicação,
//      então etapa, data e link dessas peças são atualizados a cada rodada.
// Uso:  node scripts/importar-conteudo.mjs [--fila <caminho do queue.json>] [--simular]
// Não publica nada em lugar nenhum.

import { readFileSync, existsSync } from 'node:fs';
import { envApp, workflow } from './_env.mjs';

// Lê as ideias do banco do sistema de gestão e grava a esteira no banco da Workflow.
const app = { url: envApp.NEXT_PUBLIC_SUPABASE_URL, key: envApp.NEXT_PUBLIC_SUPABASE_ANON_KEY };
const destino = workflow();
const simular = process.argv.includes('--simular');
const filaArg = process.argv.indexOf('--fila');
const fila = filaArg > -1
  ? process.argv[filaArg + 1]
  : 'C:/Users/Guilherme/Documents/workflowia/conteudo-os/clientes/guilherme-evangelista/linkedin-publisher/queue.json';

const h = ({ key }) => ({ apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' });
const get = async (path) => {
  const res = await fetch(`${app.url}/rest/v1/${path}`, { headers: h(app) });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
};
const upsert = async (rows, atualizar) => {
  if (!rows.length || simular) return;
  const res = await fetch(`${destino.url}/rest/v1/cnt_pecas?on_conflict=origem`, {
    method: 'POST',
    headers: { ...h(destino), Prefer: `resolution=${atualizar ? 'merge' : 'ignore'}-duplicates,return=minimal` },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
};

// 1. Instagram
const [ideias, inspiracoes] = await Promise.all([
  get('ig_ideas?select=*'),
  get('ig_inspirations?select=id,url'),
]);
const urlInsp = Object.fromEntries(inspiracoes.map(i => [i.id, i.url]));

const formatoIg = (i) => {
  if (i.format === 'reels' || i.format === 'stories') return 'video_curto';
  if (i.format === 'carrossel') return 'carrossel';
  if (i.format === 'estatico') return 'imagem';
  if (i.production_type === 'estatico') return 'carrossel';
  if (['rapido', 'fundo', 'roteiro'].includes(i.production_type)) return 'video_curto';
  return null;
};
const ehVideo = (f) => f === null || f === 'video_longo' || f === 'video_curto';
const etapaIg = (i, formato) => {
  if (i.status === 'brainstorm') return 'ideia';
  if (i.status === 'publicado') return 'publicado';
  return ehVideo(formato) ? 'gravar' : 'editar'; // pronta e producao
};
const gravacaoIg = { roteiro: 'camera', fundo: 'fundo', rapido: 'rapido' };

const doInstagram = ideias.map(i => {
  const formato = formatoIg(i);
  return {
    origem: `ig:${i.id}`,
    titulo: i.title,
    plataforma: 'instagram',
    formato,
    etapa: etapaIg(i, formato),
    gancho: i.hook,
    roteiro: i.description,
    referencia: urlInsp[i.inspiration_id] ?? null,
    gravacao: ehVideo(formato) ? (gravacaoIg[i.production_type] ?? null) : null,
    prioridade: [1, 2, 3].includes(i.priority) ? i.priority : 2,
    ordem: i.sort_order ?? null,
    data: i.published_at,
    link: i.post_url,
    numero1: i.views,
    numero2: i.follows,
    created_at: i.created_at,
  };
});

// 2. LinkedIn
let doLinkedin = [];
if (existsSync(fila)) {
  const itens = JSON.parse(readFileSync(fila, 'utf8'));
  doLinkedin = itens
    .filter(p => p.status !== 'skipped')
    .map(p => {
      const publicado = p.status === 'published';
      const primeira = p.text.split('\n').find(l => l.trim()) ?? p.id;
      return {
        origem: `li:${p.id}`,
        titulo: primeira.length > 120 ? primeira.slice(0, 117) + '...' : primeira,
        plataforma: 'linkedin',
        formato: p.video ? 'video_curto' : p.document ? 'carrossel' : p.images?.length ? 'imagem' : 'texto',
        etapa: publicado ? 'publicado' : 'postar',
        roteiro: p.text,
        prioridade: 2,
        data: publicado && p.published_at ? p.published_at.slice(0, 10) : p.date,
        link: p.post_urn ? `https://www.linkedin.com/feed/update/${p.post_urn}/` : null,
      };
    });
} else {
  console.log(`Fila do LinkedIn não encontrada em ${fila}; pulei.`);
}

await upsert(doInstagram, false);
await upsert(doLinkedin, true);

const conta = (rows) => rows.reduce((acc, r) => ({ ...acc, [r.etapa]: (acc[r.etapa] ?? 0) + 1 }), {});
console.log(`${simular ? '[simulação] ' : ''}Instagram: ${doInstagram.length} peças`, conta(doInstagram));
console.log(`${simular ? '[simulação] ' : ''}LinkedIn: ${doLinkedin.length} peças`, conta(doLinkedin));
