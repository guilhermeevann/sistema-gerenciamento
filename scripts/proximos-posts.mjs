// Lista a esteira de Conteúdo (tabela cnt_pecas): o que está para editar, para gravar e para postar.
// Uso:  node scripts/proximos-posts.mjs            (resumo)
//       node scripts/proximos-posts.mjs --completo (com gancho e roteiro)
// Lê do banco da Workflow (ver _env.mjs). Só leitura.
// Até 18/11/2026 lia a antiga aba Instagram (ig_ideas), que foi importada para a esteira.

import { workflow } from './_env.mjs';

const { url, key } = workflow();
const full = process.argv.includes('--completo');

const res = await fetch(`${url}/rest/v1/cnt_pecas?select=*&etapa=neq.publicado`, {
  headers: { apikey: key, Authorization: `Bearer ${key}` },
});
if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
const pecas = await res.json();

const byPriority = (a, b) =>
  a.prioridade - b.prioridade ||
  (a.ordem ?? Infinity) - (b.ordem ?? Infinity) ||
  a.created_at.localeCompare(b.created_at);

const plataformas = { youtube: 'YouTube', instagram: 'Instagram', linkedin: 'LinkedIn' };
const formatos = { video_longo: 'Vídeo longo', video_curto: 'Vídeo curto', carrossel: 'Carrossel', imagem: 'Imagem', texto: 'Texto' };
const gravacoes = { camera: 'Fala para a câmera', fundo: 'Texto sobre vídeo de fundo', rapido: 'Rápido 7 s' };
const prioridades = { 1: 'Agora', 2: 'Próxima', 3: 'Depois' };
const titulos = { editar: '✂️ Para editar', gravar: '🎬 Para gravar', postar: '📤 Para postar' };

const porId = Object.fromEntries(pecas.map(p => [p.id, p]));
const line = (p, n) => {
  const meta = [prioridades[p.prioridade], plataformas[p.plataforma], formatos[p.formato], gravacoes[p.gravacao], p.data]
    .filter(Boolean).join(' · ');
  let out = `${n}. ${p.titulo}  (${meta})`;
  if (p.mae_id) out += `\n   corte de: ${porId[p.mae_id]?.titulo ?? 'peça publicada'}`;
  if (full) {
    if (p.gancho) out += `\n   Gancho: ${p.gancho}`;
    if (p.roteiro) out += `\n   ${p.roteiro.replace(/\n/g, '\n   ')}`;
    if (p.cta) out += `\n   CTA: ${p.cta}`;
  }
  return out;
};

console.log(`# Esteira de conteúdo · ${new Date().toLocaleDateString('pt-BR')}\n`);
for (const etapa of ['editar', 'gravar', 'postar']) {
  const grupo = pecas.filter(p => p.etapa === etapa).sort(byPriority);
  if (!grupo.length) continue;
  console.log(`## ${titulos[etapa]} (${grupo.length})`);
  grupo.forEach((p, i) => console.log(line(p, i + 1)));
  console.log();
}
console.log(`Ideias ainda sem roteiro: ${pecas.filter(p => p.etapa === 'ideia').length}`);
