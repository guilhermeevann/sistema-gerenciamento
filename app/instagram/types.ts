export type IdeaStatus = 'brainstorm' | 'pronta' | 'producao' | 'publicado';
export type Performance = 'viral' | 'bom' | 'medio' | 'fraco';

export interface IgModel {
  id: string;
  name: string;
  format: string;
  description: string | null;
  structure: string | null;
  example_url: string | null;
  is_main: boolean;
  created_at: string;
}

export interface IgHook {
  id: string;
  text: string;
  category: string | null;
  profile: string | null;
  url: string | null;
  notes: string | null;
  created_at: string;
}

export const hookCategories = [
  'Curiosidade', 'Polêmica', 'Número / lista', 'Dor', 'Promessa', 'História', 'Pergunta', 'Quebra de padrão',
];

export interface IgInspiration {
  id: string;
  title: string;
  url: string | null;
  profile: string | null;
  format: string;
  notes: string | null;
  model_id: string | null;
  created_at: string;
}

export interface IgIdea {
  id: string;
  title: string;
  hook: string | null;
  description: string | null;
  status: IdeaStatus;
  format: string | null;
  pillar: string | null;
  model_id: string | null;
  inspiration_id: string | null;
  published_at: string | null;
  post_url: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
  follows: number | null;
  performance: Performance | null;
  learnings: string | null;
  // Só existem depois de rodar supabase/ig_prioridade.sql.
  priority?: number;
  sort_order?: number | null;
  created_at: string;
}

export const formats = [
  { value: 'reels', label: 'Reels' },
  { value: 'carrossel', label: 'Carrossel' },
  { value: 'estatico', label: 'Estático' },
  { value: 'stories', label: 'Stories' },
];

export const formatLabel = (value: string | null) =>
  formats.find(f => f.value === value)?.label ?? '—';

export const performanceOptions: { value: Performance; label: string; badge: string }[] = [
  { value: 'viral', label: 'Viralizou', badge: 'badge-green' },
  { value: 'bom', label: 'Bom', badge: 'badge-blue' },
  { value: 'medio', label: 'Médio', badge: 'badge-amber' },
  { value: 'fraco', label: 'Fraco', badge: 'badge-pink' },
];

export const performed = (idea: IgIdea) =>
  idea.performance === 'viral' || idea.performance === 'bom';

export const formatNumber = (n: number | null) =>
  n == null ? '—' : n.toLocaleString('pt-BR', { notation: n >= 10000 ? 'compact' : 'standard' });

export const formatDate = (date: string | null) =>
  date ? new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// Campos de texto vazios viram null para não gravar string vazia no banco.
export const orNull = (v: string) => (v.trim() ? v.trim() : null);
export const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));

// Busca sem acento e sem caixa em título, gancho, roteiro e pilar.
const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const matchesSearch = (idea: IgIdea, query: string) => {
  if (!query.trim()) return true;
  const haystack = fold([idea.title, idea.hook, idea.description, idea.pillar].filter(Boolean).join(' '));
  return fold(query).trim().split(/\s+/).every(term => haystack.includes(term));
};

export const priorityLevels = [
  { value: 1, label: '🔥 Gravar agora', short: 'Agora' },
  { value: 2, label: '⏭️ Próximas', short: 'Próxima' },
  { value: 3, label: '🕓 Depois', short: 'Depois' },
];

// Faixa de prioridade, depois ordem manual, depois as mais antigas primeiro.
export const byPriority = (a: IgIdea, b: IgIdea) =>
  (a.priority ?? 2) - (b.priority ?? 2) ||
  (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER) ||
  a.created_at.localeCompare(b.created_at);
