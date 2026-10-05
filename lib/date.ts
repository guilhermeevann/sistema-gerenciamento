// Data de hoje no fuso local (YYYY-MM-DD). `toISOString()` usa UTC e, no Brasil,
// vira o dia seguinte a partir das 21h — marcava tarefa no dia errado.
export const todayLocal = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
