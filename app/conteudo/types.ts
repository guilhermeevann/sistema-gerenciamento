// Conteúdo · a esteira de produção. Um nome para cada coisa:
// PEÇA: tudo o que vai ao ar numa plataforma.
// PEÇA-MÃE: a peça gravada de onde saem outras (em geral o vídeo do YouTube).
// CORTE: peça que sai da peça-mãe, adaptada a uma plataforma (tem mae_id).
// REFERÊNCIA: link de fora que serve de base para uma peça.

export type Plataforma = 'youtube' | 'instagram' | 'linkedin';
export type Formato = 'video_longo' | 'video_curto' | 'carrossel' | 'imagem' | 'texto';
export type Etapa = 'ideia' | 'gravar' | 'editar' | 'postar' | 'publicado';
export type Gravacao = 'camera' | 'fundo' | 'rapido';

export interface Peca {
  id: string;
  titulo: string;
  plataforma: Plataforma | null;
  formato: Formato | null;
  etapa: Etapa;
  mae_id: string | null;
  gancho: string | null;
  roteiro: string | null;
  cta: string | null;
  referencia: string | null;
  gravacao: Gravacao | null;
  prioridade: 1 | 2 | 3;
  ordem: number | null;
  data: string | null;
  link: string | null;
  numero1: number | null;
  numero2: number | null;
  origem: string | null;
  created_at: string;
}

// Cada etapa diz o que vem a seguir.
export const etapas: { value: Etapa; label: string; proximo: string }[] = [
  { value: 'ideia', label: 'Ideia', proximo: 'escrever gancho e roteiro' },
  { value: 'gravar', label: 'Para gravar', proximo: 'gravar' },
  { value: 'editar', label: 'Para editar', proximo: 'editar ou montar' },
  { value: 'postar', label: 'Para postar', proximo: 'postar na data' },
  { value: 'publicado', label: 'Publicado', proximo: 'anotar os dois números' },
];

export const etapaLabel = (e: Etapa) => etapas.find(x => x.value === e)!.label;

// Teto de peças em edição ao mesmo tempo.
export const TETO_EDITAR = 5;

export const plataformas: { value: Plataforma; label: string; cor: string; numeros: [string, string] }[] = [
  { value: 'youtube', label: 'YouTube', cor: 'var(--c-red)', numeros: ['Views', 'Inscritos ganhos'] },
  { value: 'instagram', label: 'Instagram', cor: 'var(--c-pink)', numeros: ['Views', 'Seguidores ganhos'] },
  { value: 'linkedin', label: 'LinkedIn', cor: 'var(--c-blue)', numeros: ['Impressões', 'Comentários'] },
];

export const plataformaInfo = (p: Plataforma | null) => plataformas.find(x => x.value === p) ?? null;

export const formatos: { value: Formato; label: string }[] = [
  { value: 'video_longo', label: 'Vídeo longo' },
  { value: 'video_curto', label: 'Vídeo curto' },
  { value: 'carrossel', label: 'Carrossel' },
  { value: 'imagem', label: 'Imagem' },
  { value: 'texto', label: 'Texto' },
];

export const formatoLabel = (f: Formato | null) => formatos.find(x => x.value === f)?.label ?? null;

// Só vídeo passa por "Para gravar"; carrossel, imagem e texto vão da ideia direto para a edição.
export const precisaGravar = (f: Formato | null) => f === null || f === 'video_longo' || f === 'video_curto';

export const gravacoes: { value: Gravacao; label: string; dica: string }[] = [
  { value: 'camera', label: 'Fala para a câmera', dica: 'gravar o roteiro' },
  { value: 'fundo', label: 'Texto sobre vídeo de fundo', dica: 'gravar ou escolher o fundo' },
  { value: 'rapido', label: 'Rápido 7 s', dica: 'trecho curto com a entrega na legenda' },
];

export const prioridades = [
  { value: 1, label: 'Agora' },
  { value: 2, label: 'Próxima' },
  { value: 3, label: 'Depois' },
] as const;

export const proximaEtapa = (p: Peca): Etapa | null => {
  if (p.etapa === 'ideia') return precisaGravar(p.formato) ? 'gravar' : 'editar';
  if (p.etapa === 'gravar') return 'editar';
  if (p.etapa === 'editar') return 'postar';
  if (p.etapa === 'postar') return 'publicado';
  return null;
};

// Prioridade, depois ordem manual, depois a mais antiga.
export const porPrioridade = (a: Peca, b: Peca) =>
  a.prioridade - b.prioridade ||
  (a.ordem ?? Number.MAX_SAFE_INTEGER) - (b.ordem ?? Number.MAX_SAFE_INTEGER) ||
  a.created_at.localeCompare(b.created_at);

export const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const dataCurta = (d: string | null) =>
  d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : null;

export const numero = (n: number | null) =>
  n == null ? '—' : n.toLocaleString('pt-BR', { notation: n >= 10000 ? 'compact' : 'standard' });

export const orNull = (v: string) => (v.trim() ? v.trim() : null);
export const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const busca = (p: Peca, q: string) => {
  if (!q.trim()) return true;
  const texto = fold([p.titulo, p.gancho, p.roteiro, p.cta].filter(Boolean).join(' '));
  return fold(q).trim().split(/\s+/).every(t => texto.includes(t));
};
