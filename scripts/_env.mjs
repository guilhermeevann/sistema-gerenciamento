// Lê as variáveis dos scripts. O banco do app é o do sistema de gestão (NEXT_PUBLIC_*);
// a esteira de Conteúdo mora no banco da Workflow (WORKFLOW_*). Se WORKFLOW_* não estiver no
// .env.local deste projeto, lê do arquivo do CRM no conteudo-os, sem copiar o valor.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CRM_ENV = 'C:/Users/Guilherme/Documents/workflowia/conteudo-os/clientes/guilherme-evangelista/crm/.env.local';

const ler = (arquivo) => existsSync(arquivo)
  ? Object.fromEntries(readFileSync(arquivo, 'utf8').split(/\r?\n/).filter(l => l.includes('=') && !l.trim().startsWith('#'))
      .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]))
  : {};

export const envApp = { ...ler(join(root, '.env.local')), ...process.env };

export const workflow = () => {
  if (envApp.WORKFLOW_SUPABASE_URL && envApp.WORKFLOW_SUPABASE_SECRET_KEY)
    return { url: envApp.WORKFLOW_SUPABASE_URL, key: envApp.WORKFLOW_SUPABASE_SECRET_KEY };
  const crm = ler(CRM_ENV);
  if (crm.SUPABASE_URL && crm.SUPABASE_SECRET_KEY) return { url: crm.SUPABASE_URL, key: crm.SUPABASE_SECRET_KEY };
  throw new Error('Sem acesso ao banco da Workflow: defina WORKFLOW_SUPABASE_URL e WORKFLOW_SUPABASE_SECRET_KEY.');
};
