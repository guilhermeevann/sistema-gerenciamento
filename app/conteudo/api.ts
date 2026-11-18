// Acesso à esteira pelo servidor do app (rotas /api/conteudo). Ver lib/workflowDb.ts.
import { Peca } from './types';

type Resultado<T> = { data: T | null; error: { code?: string; message: string } | null };

const chamar = async <T>(url: string, init?: RequestInit): Promise<Resultado<T>> => {
  try {
    const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
    const json = await res.json();
    if (!res.ok) return { data: null, error: { code: json.error, message: json.message ?? 'Erro' } };
    return { data: json as T, error: null };
  } catch (e) {
    return { data: null, error: { message: (e as Error).message } };
  }
};

export const listar = () => chamar<Peca[]>('/api/conteudo');
export const criar = (campos: Partial<Peca>) => chamar<Peca>('/api/conteudo', { method: 'POST', body: JSON.stringify(campos) });
export const atualizar = (id: string, campos: Partial<Peca>) =>
  chamar<{ ok: true }>(`/api/conteudo/${id}`, { method: 'PATCH', body: JSON.stringify(campos) });
export const apagar = (id: string) => chamar<{ ok: true }>(`/api/conteudo/${id}`, { method: 'DELETE' });
