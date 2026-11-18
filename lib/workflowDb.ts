// Cliente do Supabase da Workflow (o mesmo do CRM e da automação), SÓ PARA O SERVIDOR.
// Usa a chave secreta: nunca importar este arquivo num componente "use client".
// A chave pública desse projeto não pode ir para o navegador, porque outras tabelas de lá
// (leads, conversas) estão abertas para ela. Por isso a aba Conteúdo passa pelas rotas /api/conteudo.
import { createClient } from '@supabase/supabase-js';

export const workflowDb = () => {
  const url = process.env.WORKFLOW_SUPABASE_URL;
  const key = process.env.WORKFLOW_SUPABASE_SECRET_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};

// Campos que o app pode gravar em cnt_pecas.
export const CAMPOS_PECA = [
  'titulo', 'plataforma', 'formato', 'etapa', 'mae_id', 'gancho', 'roteiro', 'cta', 'referencia',
  'gravacao', 'prioridade', 'ordem', 'data', 'link', 'numero1', 'numero2',
] as const;

export const soCampos = (body: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(body).filter(([k]) => (CAMPOS_PECA as readonly string[]).includes(k)));
