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
