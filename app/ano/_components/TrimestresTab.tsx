"use client";

import styles from '../ano.module.css';
import { YearGoal, YearMeasure, YearReview, areaOf, currentQuarter, fmtNumber, measureProgress, quarterLabel } from '../types';

interface Props {
  year: number;
  goals: YearGoal[];
  measures: YearMeasure[];
  reviews: YearReview[];
}

// O ano em 4 ciclos de ~12 semanas: o que vence em cada um e como foi a revisão.
export default function TrimestresTab({ year, goals, measures, reviews }: Props) {
  const now = currentQuarter(year);
  const goalById = Object.fromEntries(goals.map(g => [g.id, g]));

  return (
    <section className={styles.section}>
      <p className={styles.hint}>
        Cada trimestre é um ciclo curto: ~12 semanas de execução e 1 de revisão. Marque o trimestre nos objetivos, resultados e alavancas para eles aparecerem aqui.
      </p>
      <div className={styles.quarterGrid}>
        {[1, 2, 3, 4].map(q => {
          const qGoals = goals.filter(g => g.quarter === q && g.status !== 'pausado');
          const qMeasures = measures.filter(m => m.quarter === q && goalById[m.goal_id]?.status !== 'pausado');
          const review = reviews.find(r => r.quarter === q);
          return (
            <div key={q} className={`${styles.quarter} ${now === q ? styles.quarterNow : ''} glass-panel`}>
              <div className={styles.quarterHeader}>
                <span className={styles.quarterName}>T{q}</span>
                <span className={styles.quarterDates}>{quarterLabel(year, q)}</span>
                {now === q && <span className={styles.nowBadge}>agora</span>}
              </div>

              {qGoals.length === 0 && qMeasures.length === 0 && (
                <p className={styles.empty}>Nada com prazo neste trimestre.</p>
              )}

              {qGoals.length > 0 && (
                <div className={styles.quarterBlock}>
                  <h4>🎯 Objetivos com prazo aqui</h4>
                  {qGoals.map(g => (
                    <div key={g.id} className={styles.quarterItem} style={{ borderLeftColor: areaOf(g.area).color }}>
                      <span className={g.status === 'concluido' ? styles.done : ''}>{g.title}</span>
                    </div>
                  ))}
                </div>
              )}

              {qMeasures.length > 0 && (
                <div className={styles.quarterBlock}>
                  <h4>📊 Resultados e ⚙️ alavancas</h4>
                  {qMeasures.map(m => {
                    const g = goalById[m.goal_id];
                    const p = measureProgress(m);
                    return (
                      <div key={m.id} className={styles.quarterItem} style={{ borderLeftColor: g ? areaOf(g.area).color : undefined }}>
                        <span>{m.kind === 'resultado' ? '📊' : '⚙️'} {m.title}</span>
                        <span className={styles.quarterMeta}>
                          {m.kind === 'resultado'
                            ? `${fmtNumber(m.current_value, m.unit)} / ${fmtNumber(m.target_value, m.unit)}${p !== null ? ` · ${Math.round(p * 100)}%` : ''}`
                            : m.frequency ?? ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className={styles.quarterReview}>
                {review ? (
                  <>🔁 Revisão feita{review.score ? ` · nota ${review.score}/10` : ''}</>
                ) : (
                  <span className={styles.muted}>Revisão ainda não feita</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
