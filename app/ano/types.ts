export type Area = 'espiritual' | 'familia' | 'saude' | 'financas' | 'negocio' | 'desenvolvimento';
export type GoalStatus = 'ativo' | 'concluido' | 'pausado';
export type MeasureKind = 'resultado' | 'alavanca';

export interface YearPlan {
  year: number;
  word: string | null;
  vision: string | null;
  anti_goals: string | null;
}

export interface YearGoal {
  id: string;
  year: number;
  title: string;
  area: Area;
  why: string | null;
  quarter: number | null;
  obstacle: string | null;
  if_then: string | null;
  status: GoalStatus;
  sort_order: number | null;
  // Submeta: aponta para a meta-mãe. Só existe depois de rodar supabase/submetas.sql.
  parent_id?: string | null;
  created_at: string;
}

export interface YearMeasure {
  id: string;
  goal_id: string;
  kind: MeasureKind;
  title: string;
  unit: string | null;
  start_value: number | null;
  target_value: number | null;
  current_value: number | null;
  frequency: string | null;
  quarter: number | null;
  created_at: string;
}

export interface YearReview {
  id: string;
  year: number;
  quarter: number;
  score: number | null;
  worked: string | null;
  adjust: string | null;
}

export const areas: { value: Area; label: string; color: string }[] = [
  { value: 'espiritual', label: '🙏 Espiritual', color: 'var(--c-violet)' },
  { value: 'familia', label: '🏡 Família', color: 'var(--c-pink)' },
  { value: 'saude', label: '💪 Saúde', color: 'var(--c-green)' },
  { value: 'financas', label: '💰 Finanças', color: 'var(--c-amber)' },
  { value: 'negocio', label: '🚀 Negócio', color: 'var(--c-blue)' },
  { value: 'desenvolvimento', label: '📚 Desenvolvimento', color: 'var(--c-cyan)' },
];

export const areaOf = (value: string) => areas.find(a => a.value === value) ?? areas[4];

export const statusLabels: Record<GoalStatus, string> = {
  ativo: 'Em andamento',
  concluido: 'Concluído',
  pausado: 'Pausado',
};

// Recomendação das práticas pesquisadas: poucos objetivos ativos por ano.
export const MAX_FOCUS = 5;

export const quarterRange = (year: number, q: number) => {
  const start = new Date(year, (q - 1) * 3, 1, 12);
  const end = new Date(year, q * 3, 0, 12);
  return { start, end };
};

export const quarterLabel = (year: number, q: number) => {
  const { start, end } = quarterRange(year, q);
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  return `${fmt(start)} → ${fmt(end)}`;
};

export const currentQuarter = (year: number, today = new Date()) =>
  today.getFullYear() === year ? Math.floor(today.getMonth() / 3) + 1 : null;

// Progresso de um resultado-chave: quanto do caminho entre início e meta já foi feito.
export const measureProgress = (m: YearMeasure) => {
  if (m.kind !== 'resultado' || m.target_value == null) return null;
  const start = m.start_value ?? 0;
  const span = m.target_value - start;
  if (span === 0) return (m.current_value ?? start) >= m.target_value ? 1 : 0;
  return Math.min(1, Math.max(0, ((m.current_value ?? start) - start) / span));
};

// Progresso de uma meta: média dos próprios resultados-chave e das submetas.
// Submeta concluída conta 100%; aberta conta pelo próprio progresso (ou 0%).
export const goalProgress = (goal: YearGoal, measures: YearMeasure[], allGoals: YearGoal[] = []): number | null => {
  if (goal.status === 'concluido') return 1;
  const own = measures.filter(m => m.goal_id === goal.id).map(measureProgress).filter((v): v is number => v !== null);
  const subs = allGoals
    .filter(g => g.parent_id === goal.id && g.status !== 'pausado')
    .map(g => goalProgress(g, measures, allGoals) ?? 0);
  const values = [...own, ...subs];
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
};

export const isTopLevel = (g: YearGoal) => !g.parent_id;

export const fmtNumber = (n: number | null, unit?: string | null) => {
  if (n == null) return '—';
  const v = n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  if (!unit) return v;
  return unit === 'R$' ? `R$ ${v}` : `${v} ${unit}`;
};

export const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));
export const textOrNull = (v: string) => (v.trim() ? v.trim() : null);

// A partir de outubro, o ano em planejamento é o seguinte.
export const planningYear = (today = new Date()) => (today.getMonth() >= 9 ? today.getFullYear() + 1 : today.getFullYear());
