"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/Toast';
import styles from '../ano.module.css';
import { YearGoal, YearMeasure, YearPlan, areas, goalProgress, textOrNull } from '../types';

interface Props {
  year: number;
  plan: YearPlan | null;
  goals: YearGoal[];
  measures: YearMeasure[];
  onChange: () => void;
}

export default function VisaoTab({ year, plan, goals, measures, onChange }: Props) {
  const [word, setWord] = useState(plan?.word ?? '');
  const [vision, setVision] = useState(plan?.vision ?? '');
  const [antiGoals, setAntiGoals] = useState(plan?.anti_goals ?? '');
  const [saving, setSaving] = useState(false);

  const dirty =
    word !== (plan?.word ?? '') || vision !== (plan?.vision ?? '') || antiGoals !== (plan?.anti_goals ?? '');

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('year_plans').upsert({
      year,
      word: textOrNull(word),
      vision: textOrNull(vision),
      anti_goals: textOrNull(antiGoals),
    });
    setSaving(false);
    if (error) { showToast('Erro ao salvar a visão.', 'error'); return; }
    showToast('Visão do ano salva!');
    onChange();
  };

  return (
    <div className={styles.visionLayout}>
      <form onSubmit={save} className={`${styles.panel} glass-panel`}>
        <div className={styles.formGroup}>
          <label>Palavra / versículo do ano</label>
          <input value={word} onChange={e => setWord(e.target.value)} placeholder="Ex: Constância · ou um versículo que guia o ano" />
        </div>
        <div className={styles.formGroup}>
          <label>Como quero estar em 31/12/{year}</label>
          <textarea rows={6} value={vision} onChange={e => setVision(e.target.value)} placeholder="Escreva no presente, como se já tivesse acontecido: onde moro, como está o negócio, a família, a saúde, a fé..." />
        </div>
        <div className={styles.formGroup}>
          <label>O que eu não vou fazer em {year}</label>
          <textarea rows={4} value={antiGoals} onChange={e => setAntiGoals(e.target.value)} placeholder="Projetos, hábitos e compromissos que ficam de fora para os objetivos caberem" />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving || !dirty}>
          {saving ? 'Salvando...' : dirty ? 'Salvar visão' : 'Salvo'}
        </button>
      </form>

      <div className={`${styles.panel} glass-panel`}>
        <h3 className={styles.panelTitle}>Áreas da vida em {year}</h3>
        <p className={styles.hint}>Um olhar rápido para ver se alguma área ficou sem objetivo nenhum.</p>
        <div className={styles.areaList}>
          {areas.map(area => {
            const areaGoals = goals.filter(g => g.area === area.value && g.status !== 'pausado');
            const ps = areaGoals.map(g => goalProgress(g, measures)).filter((v): v is number => v !== null);
            const avg = ps.length ? Math.round((ps.reduce((a, b) => a + b, 0) / ps.length) * 100) : null;
            return (
              <div key={area.value} className={styles.areaRow}>
                <span className={styles.areaName}>{area.label}</span>
                <span className={styles.areaBar}>
                  <span style={{ width: `${avg ?? 0}%`, background: area.color }} />
                </span>
                <span className={styles.areaMeta}>
                  {areaGoals.length === 0 ? 'sem objetivo' : `${areaGoals.length} obj.${avg !== null ? ` · ${avg}%` : ''}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
