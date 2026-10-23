"use client";

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/Toast';
import styles from './ano.module.css';
import { YearGoal, YearMeasure, YearPlan, YearReview, goalProgress, planningYear } from './types';
import VisaoTab from './_components/VisaoTab';
import ObjetivosTab from './_components/ObjetivosTab';
import TrimestresTab from './_components/TrimestresTab';
import RevisoesTab from './_components/RevisoesTab';

type Tab = 'visao' | 'objetivos' | 'trimestres' | 'revisoes';

const tabs: { id: Tab; label: string }[] = [
  { id: 'visao', label: '🧭 Visão' },
  { id: 'objetivos', label: '🎯 Objetivos' },
  { id: 'trimestres', label: '📅 Trimestres' },
  { id: 'revisoes', label: '🔁 Revisões' },
];

export default function Ano() {
  const [year, setYear] = useState(planningYear());
  const [tab, setTab] = useState<Tab>('visao');
  const [plan, setPlan] = useState<YearPlan | null>(null);
  const [goals, setGoals] = useState<YearGoal[]>([]);
  const [measures, setMeasures] = useState<YearMeasure[]>([]);
  const [reviews, setReviews] = useState<YearReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingTables, setMissingTables] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  // Ano da última busca pedida: respostas de um ano anterior que chegam atrasadas são descartadas.
  const requestedYear = useRef(year);

  const fetchData = async (y = year) => {
    requestedYear.current = y;
    const [p, g, r] = await Promise.all([
      supabase.from('year_plans').select('*').eq('year', y).maybeSingle(),
      supabase.from('year_goals').select('*').eq('year', y).order('sort_order', { ascending: true, nullsFirst: false }).order('created_at', { ascending: true }),
      supabase.from('year_reviews').select('*').eq('year', y),
    ]);
    const err = p.error || g.error || r.error;
    if (err && (err.code === 'PGRST205' || err.code === '42P01')) { setMissingTables(true); setLoading(false); return; }
    if (err) showToast('Erro ao carregar o planejamento.', 'error');

    if (requestedYear.current !== y) return;
    const goalIds = (g.data ?? []).map(x => x.id);
    const m = goalIds.length
      ? await supabase.from('year_measures').select('*').in('goal_id', goalIds).order('created_at', { ascending: true })
      : { data: [], error: null };
    if (requestedYear.current !== y) return;
    if (m.error) showToast('Erro ao carregar resultados-chave.', 'error');

    setPlan(p.data ?? null);
    setGoals(g.data ?? []);
    setReviews(r.data ?? []);
    setMeasures(m.data ?? []);
    setLoading(false);
  };

  // ?ano=2026 abre direto naquele ano (links da Home e da antiga página Metas).
  useEffect(() => {
    const fromUrl = Number(new URLSearchParams(window.location.search).get('ano'));
    if (fromUrl >= 2000 && fromUrl <= 2100) setYear(fromUrl);
  }, []);

  // Troca de ano recarrega tudo, para nenhuma aba mostrar dado do ano anterior.
  useEffect(() => { setLoading(true); fetchData(year); }, [year]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = goals.filter(g => g.status !== 'pausado');
  const progresses = active.map(g => goalProgress(g, measures)).filter((v): v is number => v !== null);
  const overall = progresses.length ? Math.round((progresses.reduce((a, b) => a + b, 0) / progresses.length) * 100) : null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <div className={styles.yearNav}>
            <button className={styles.yearBtn} onClick={() => setYear(y => y - 1)} aria-label="Ano anterior">‹</button>
            <h1 className={styles.yearTitle}>{year}</h1>
            <button className={styles.yearBtn} onClick={() => setYear(y => y + 1)} aria-label="Próximo ano">›</button>
          </div>
          <p className="text-secondary">
            {plan?.word ? <>Palavra do ano: <strong className={styles.word}>{plan.word}</strong></> : 'Planejamento do ano: visão, poucos objetivos, ciclos de 12 semanas e revisão.'}
          </p>
        </div>
        {overall !== null && (
          <div className={`${styles.overall} glass-panel`}>
            <span className={styles.overallValue}>{overall}%</span>
            <span className={styles.overallLabel}>progresso médio dos objetivos</span>
          </div>
        )}
      </header>

      <button className={styles.guideToggle} onClick={() => setShowGuide(v => !v)}>
        {showGuide ? '▾' : '▸'} Como esta seção funciona (boas práticas)
      </button>
      {showGuide && (
        <div className={`${styles.guide} glass-panel`}>
          <ol>
            <li><strong>Visão primeiro.</strong> Escreva como quer estar em 31/12 e a palavra que guia o ano. Os objetivos saem dela.</li>
            <li><strong>Poucos objetivos.</strong> De 3 a 5 ativos. O resto vai para &ldquo;pausado&rdquo; ou para o ano seguinte.</li>
            <li><strong>Resultado × alavanca.</strong> Resultado é o número que você quer (faturamento, clientes, peso) e não controla direto. Alavanca é a ação semanal que você controla e que move o resultado.</li>
            <li><strong>Ciclos de 12 semanas.</strong> O ano é dividido em 4 trimestres, cada um com seus resultados. Prazo curto tira a sensação de &ldquo;ainda tem tempo&rdquo;.</li>
            <li><strong>Obstáculo e plano se-então.</strong> Para cada objetivo, nomeie o obstáculo provável e decida antes o que fazer quando ele aparecer.</li>
            <li><strong>Revisão.</strong> Atualize os números toda semana e faça a revisão do trimestre: nota, o que funcionou, o que ajustar.</li>
          </ol>
        </div>
      )}

      {loading ? (
        <div className="page-loading">Carregando...</div>
      ) : missingTables ? (
        <div className={`${styles.setupBox} glass-panel`}>
          <strong>⚙️ Falta criar as tabelas do planejamento anual</strong>
          <p className="text-secondary">No SQL Editor do Supabase, cole o conteúdo de <code>supabase/ano.sql</code> e clique em Run. Depois recarregue a página.</p>
        </div>
      ) : (
        <>
          <nav className={styles.tabs}>
            {tabs.map(t => (
              <button key={t.id} className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
                {t.id === 'objetivos' && <span className={styles.tabCount}>{active.length}</span>}
              </button>
            ))}
          </nav>

          {tab === 'visao' && <VisaoTab key={year} year={year} plan={plan} goals={goals} measures={measures} onChange={() => fetchData()} />}
          {tab === 'objetivos' && <ObjetivosTab year={year} goals={goals} measures={measures} onChange={() => fetchData()} />}
          {tab === 'trimestres' && <TrimestresTab year={year} goals={goals} measures={measures} reviews={reviews} />}
          {tab === 'revisoes' && <RevisoesTab key={year} year={year} reviews={reviews} onChange={() => fetchData()} />}
        </>
      )}
    </div>
  );
}
