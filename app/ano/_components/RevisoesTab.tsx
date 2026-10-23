"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/Toast';
import styles from '../ano.module.css';
import { YearReview, currentQuarter, quarterLabel, textOrNull } from '../types';

interface Props {
  year: number;
  reviews: YearReview[];
  onChange: () => void;
}

const empty = { score: '', worked: '', adjust: '' };

export default function RevisoesTab({ year, reviews, onChange }: Props) {
  const [quarter, setQuarter] = useState(currentQuarter(year) ?? 1);
  const existing = reviews.find(r => r.quarter === quarter);
  const [form, setForm] = useState(() => toForm(existing));
  const [saving, setSaving] = useState(false);

  function toForm(r?: YearReview) {
    return r ? { score: r.score?.toString() ?? '', worked: r.worked ?? '', adjust: r.adjust ?? '' } : empty;
  }

  const pick = (q: number) => {
    setQuarter(q);
    setForm(toForm(reviews.find(r => r.quarter === q)));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('year_reviews').upsert(
      {
        year,
        quarter,
        score: form.score ? Number(form.score) : null,
        worked: textOrNull(form.worked),
        adjust: textOrNull(form.adjust),
      },
      { onConflict: 'year,quarter' }
    );
    setSaving(false);
    if (error) { showToast('Erro ao salvar a revisão.', 'error'); return; }
    showToast(`Revisão do T${quarter} salva!`);
    onChange();
  };

  return (
    <section className={styles.section}>
      <div className={`${styles.panel} glass-panel`}>
        <h3 className={styles.panelTitle}>Ritmo de acompanhamento</h3>
        <ul className={styles.rhythm}>
          <li><strong>Toda semana (15 min):</strong> atualize os números dos resultados-chave na aba Objetivos e veja se as alavancas foram feitas. Medir é retorno, não cobrança.</li>
          <li><strong>Fim de cada trimestre:</strong> dê uma nota de 1 a 10, registre o que funcionou e o que vai ajustar no próximo ciclo.</li>
          <li><strong>Objetivo fixo, caminho flexível:</strong> se um resultado-chave se mostrou errado, troque o número ou a alavanca, não o objetivo.</li>
        </ul>
      </div>

      <div className={styles.quarterTabs}>
        {[1, 2, 3, 4].map(q => {
          const done = reviews.some(r => r.quarter === q);
          return (
            <button key={q} className={`${styles.quarterTab} ${quarter === q ? styles.quarterTabActive : ''}`} onClick={() => pick(q)}>
              T{q} {done ? '✓' : ''}
              <small>{quarterLabel(year, q)}</small>
            </button>
          );
        })}
      </div>

      <form onSubmit={save} className={`${styles.panel} glass-panel`}>
        <div className={styles.formGroup}>
          <label>Nota do trimestre {form.score && `— ${form.score}/10`}</label>
          <div className={styles.scoreRow}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                type="button"
                className={`${styles.scoreBtn} ${Number(form.score) === n ? styles.scoreActive : ''}`}
                onClick={() => setForm(f => ({ ...f, score: Number(f.score) === n ? '' : String(n) }))}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.formGroup}>
          <label>✅ O que funcionou</label>
          <textarea rows={4} value={form.worked} onChange={e => { const worked = e.target.value; setForm(f => ({ ...f, worked })); }} placeholder="Hábitos, decisões e alavancas que deram resultado" />
        </div>
        <div className={styles.formGroup}>
          <label>🔧 O que vou ajustar no próximo ciclo</label>
          <textarea rows={4} value={form.adjust} onChange={e => { const adjust = e.target.value; setForm(f => ({ ...f, adjust })); }} placeholder="O que parar, o que começar, qual número ou alavanca trocar" />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : existing ? `Atualizar revisão do T${quarter}` : `Salvar revisão do T${quarter}`}
        </button>
      </form>
    </section>
  );
}
