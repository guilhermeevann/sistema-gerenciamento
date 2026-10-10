// Lista os próximos posts do planejamento do Instagram, na ordem de prioridade do Banco de ideias.
// Uso:  node scripts/proximos-posts.mjs            (resumo)
//       node scripts/proximos-posts.mjs --completo (com gancho e roteiro)
// Lê URL e chave do .env.local deste projeto. Só leitura.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(join(root, '.env.local'), 'utf8')
    .split(/\r?\n/)
    .filter(line => line.includes('='))
    .map(line => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()])
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const full = process.argv.includes('--completo');

const get = async (path) => {
  const res = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
};

const [ideas, models] = await Promise.all([
  get('ig_ideas?select=*&status=in.(pronta,producao,brainstorm)'),
  get('ig_models?select=id,name'),
]);

const modelName = Object.fromEntries(models.map(m => [m.id, m.name]));
const byPriority = (a, b) =>
  (a.priority ?? 2) - (b.priority ?? 2) ||
  (a.sort_order ?? Infinity) - (b.sort_order ?? Infinity) ||
  a.created_at.localeCompare(b.created_at);

const levels = { 1: '🔥 Gravar agora', 2: '⏭️ Próximas', 3: '🕓 Depois' };
const formats = { reels: 'Reels', carrossel: 'Carrossel', estatico: 'Estático', stories: 'Stories' };
const types = { rapido: '⚡ Rápido 7s', fundo: '🎞️ Fundo', roteiro: '🎬 Roteiro', estatico: '🖼️ Carrossel / estático' };

const line = (idea, n) => {
  const meta = [types[idea.production_type], formats[idea.format], modelName[idea.model_id], idea.pillar].filter(Boolean).join(' · ');
  let out = `${n}. ${idea.title}${meta ? `  (${meta})` : ''}`;
  if (full) {
    if (idea.hook) out += `\n   Gancho: ${idea.hook}`;
    if (idea.description) out += `\n   ${idea.description.replace(/\n/g, '\n   ')}`;
  }
  return out;
};

const production = ideas.filter(i => i.status === 'producao').sort(byPriority);
const ready = ideas.filter(i => i.status === 'pronta').sort(byPriority);
const brainstorm = ideas.filter(i => i.status === 'brainstorm');

console.log(`# Próximos posts · ${new Date().toLocaleDateString('pt-BR')}\n`);

if (production.length) {
  console.log('## 🎬 Em produção');
  production.forEach((idea, i) => console.log(line(idea, i + 1)));
  console.log();
}

for (const [value, label] of Object.entries(levels)) {
  const group = ready.filter(i => (i.priority ?? 2) === Number(value));
  if (!group.length) continue;
  console.log(`## ${label}`);
  group.forEach((idea, i) => console.log(line(idea, i + 1)));
  console.log();
}

console.log(`Tempestade (ideias ainda sem triagem): ${brainstorm.length}`);
