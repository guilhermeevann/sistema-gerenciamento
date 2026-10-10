export type MilestoneKind = 'trabalho' | 'pessoal' | 'mudanca' | 'viagem' | 'data';

export interface Milestone {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  approximate: boolean;
  kind: MilestoneKind;
  notes: string | null;
  done: boolean;
  created_at: string;
}

export const kinds: { value: MilestoneKind; label: string; color: string }[] = [
  { value: 'trabalho', label: '💼 Trabalho', color: '#05f698' },
  { value: 'pessoal', label: '🙋 Pessoal', color: '#60a5fa' },
  { value: 'mudanca', label: '📦 Mudança', color: '#fbbf24' },
  { value: 'viagem', label: '✈️ Viagem', color: '#f472b6' },
  { value: 'data', label: '🎉 Data especial', color: '#a78bfa' },
];

export const kindOf = (value: string) => kinds.find(k => k.value === value) ?? kinds[1];

const DAY = 86_400_000;

// Datas como meio-dia local: evita o dia "pular" por fuso.
export const parseDate = (iso: string) => new Date(`${iso}T12:00:00`);

export const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY);

export const monthName = (d: Date) => d.toLocaleDateString('pt-BR', { month: 'long' });

export const monthLabel = (d: Date) => {
  const m = monthName(d);
  return m.charAt(0).toUpperCase() + m.slice(1);
};

// "28 out" ou, se aproximada, "fim de out".
export const dateLabel = (m: Milestone) => {
  const d = parseDate(m.date);
  const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  if (!m.approximate) return `${d.getDate()} ${month}`;
  const part = d.getDate() <= 10 ? 'início' : d.getDate() <= 20 ? 'meados' : 'fim';
  return `${part} de ${month}`;
};

export const countdown = (m: Milestone, today: Date) => {
  const n = daysBetween(today, parseDate(m.date));
  if (m.done) return 'feito';
  if (n === 0) return 'hoje';
  if (n === 1) return 'amanhã';
  if (n > 0) return `em ${n} dias`;
  return n === -1 ? 'ontem' : `há ${-n} dias`;
};

// Intervalo exibido: do dia 1 do mês inicial ao dia 1 do mês seguinte ao último.
export const rangeOf = (start: Date, months: number) => {
  const from = new Date(start.getFullYear(), start.getMonth(), 1, 12);
  const to = new Date(start.getFullYear(), start.getMonth() + months, 1, 12);
  const monthStarts = Array.from({ length: months + 1 }, (_, i) => new Date(start.getFullYear(), start.getMonth() + i, 1, 12));
  return { from, to, monthStarts, totalDays: daysBetween(from, to) };
};
