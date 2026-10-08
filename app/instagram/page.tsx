"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/Toast';
import styles from './instagram.module.css';
import { IdeaStatus, IgIdea, IgInspiration, IgModel, byPriority, formatNumber, performanceOptions, performed } from './types';
import ModelosTab from './_components/ModelosTab';
import InspiracoesTab from './_components/InspiracoesTab';
import TempestadeTab from './_components/TempestadeTab';
import BancoTab from './_components/BancoTab';
import PublicadosTab from './_components/PublicadosTab';
import IdeaModal from './_components/IdeaModal';

type Tab = 'geral' | 'modelos' | 'inspiracoes' | 'tempestade' | 'banco' | 'publicados';

export default function Instagram() {
  const [tab, setTab] = useState<Tab>('geral');
  const [models, setModels] = useState<IgModel[]>([]);
  const [inspirations, setInspirations] = useState<IgInspiration[]>([]);
  const [ideas, setIdeas] = useState<IgIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingTables, setMissingTables] = useState(false);

  // `key` remonta o modal a cada abertura, para o formulário nascer com os dados da ideia.
  const [ideaModal, setIdeaModal] = useState<{ open: boolean; idea: IgIdea | null; status: IdeaStatus; key: number }>({
    open: false, idea: null, status: 'pronta', key: 0,
  });

  const fetchData = async () => {
    const [m, i, d] = await Promise.all([
      supabase.from('ig_models').select('*').order('created_at', { ascending: true }),
      supabase.from('ig_inspirations').select('*').order('created_at', { ascending: false }),
      supabase.from('ig_ideas').select('*').order('created_at', { ascending: false }),
    ]);
    const err = m.error || i.error || d.error;
    // PGRST205/42P01: tabela não existe ainda, o SQL de supabase/instagram.sql não foi rodado.
    if (err && (err.code === 'PGRST205' || err.code === '42P01')) setMissingTables(true);
    else if (err) showToast('Erro ao carregar o planejamento.', 'error');
    if (m.data) setModels(m.data);
    if (i.data) setInspirations(i.data);
    if (d.data) setIdeas(d.data);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const openIdea = (idea: IgIdea | null, status?: IdeaStatus) =>
    setIdeaModal(prev => ({ open: true, idea, status: status ?? idea?.status ?? 'pronta', key: prev.key + 1 }));

  const count = (status: IdeaStatus) => ideas.filter(i => i.status === status).length;
  const published = ideas.filter(i => i.status === 'publicado');
  const hits = published.filter(performed);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'geral', label: '📊 Visão geral' },
    { id: 'modelos', label: '🧩 Modelos', count: models.length },
    { id: 'inspiracoes', label: '✨ Inspirações', count: inspirations.length },
    { id: 'tempestade', label: '🌪️ Tempestade', count: count('brainstorm') },
    { id: 'banco', label: '💡 Banco de ideias', count: count('pronta') + count('producao') },
    { id: 'publicados', label: '📤 Publicados', count: published.length },
  ];

  const topPosts = [...published]
    .sort((a, b) => (b.views ?? -1) - (a.views ?? -1))
    .slice(0, 5);

  const readyIdeas = ideas.filter(i => i.status === 'pronta').sort(byPriority).slice(0, 5);

  const renderOverview = () => (
    <section className={styles.section}>
      <div className={styles.statsGrid}>
        {[
          { label: 'Modelos', value: models.length, tab: 'modelos' as Tab },
          { label: 'Inspirações', value: inspirations.length, tab: 'inspiracoes' as Tab },
          { label: 'Na tempestade', value: count('brainstorm'), tab: 'tempestade' as Tab },
          { label: 'Ainda não postadas', value: count('pronta') + count('producao'), tab: 'banco' as Tab },
          { label: 'Publicados', value: published.length, tab: 'publicados' as Tab },
          { label: 'Performaram', value: hits.length, tab: 'publicados' as Tab },
        ].map(stat => (
          <button key={stat.label} className={`${styles.statCard} glass-panel`} onClick={() => setTab(stat.tab)}>
            <span className={styles.statValue}>{stat.value}</span>
            <span className={styles.statLabel}>{stat.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.funnel}>
        <span>🌪️ {count('brainstorm')} na tempestade</span><span>→</span>
        <span>✅ {count('pronta')} prontas</span><span>→</span>
        <span>🎬 {count('producao')} em produção</span><span>→</span>
        <span>📤 {published.length} publicadas</span><span>→</span>
        <span>🔥 {hits.length} performaram</span>
      </div>

      <div className={styles.overviewCols}>
        <div className={`${styles.panel} glass-panel`}>
          <h3 className={styles.panelTitle}>🔥 Top posts por views</h3>
          {topPosts.length === 0 && <p className={styles.sectionHint}>Nenhum post registrado ainda.</p>}
          {topPosts.map(post => {
            const perf = performanceOptions.find(p => p.value === post.performance);
            return (
              <div key={post.id} className={styles.rowItem}>
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</span>
                <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {perf && <span className={`badge ${perf.badge}`}>{perf.label}</span>}
                  <span className={styles.rowMeta}>{formatNumber(post.views)} views</span>
                </span>
              </div>
            );
          })}
        </div>
        <div className={`${styles.panel} glass-panel`}>
          <h3 className={styles.panelTitle}>✅ Prontas pra produzir</h3>
          {readyIdeas.length === 0 && <p className={styles.sectionHint}>Nenhuma ideia pronta. Passe algumas da tempestade pro banco.</p>}
          {readyIdeas.map(idea => (
            <button key={idea.id} className={styles.rowItem} onClick={() => openIdea(idea)} style={{ textAlign: 'left' }}>
              <span>{idea.title}</span>
              <span className={styles.rowMeta}>{models.find(m => m.id === idea.model_id)?.name ?? ''}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className="h2">Planejamento do Instagram</h1>
          <p className="text-secondary">Modelos, inspirações, ideias e o que já foi ao ar, num lugar só.</p>
        </div>
        {!missingTables && (
          <button className="btn btn-primary" onClick={() => setTab('tempestade')}>🌪️ Anotar ideia</button>
        )}
      </header>

      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <span className="text-secondary">Carregando...</span>
        </div>
      ) : missingTables ? (
        <div className={`${styles.setupBox} glass-panel`}>
          <h3 className={styles.panelTitle}>⚙️ Falta criar as tabelas no Supabase</h3>
          <p className={styles.sectionHint}>
            Abra o SQL Editor do projeto no Supabase, cole o conteúdo de <code>supabase/instagram.sql</code> e clique em Run.
            Depois recarregue esta página.
          </p>
        </div>
      ) : (
        <>
          <nav className={styles.tabs}>
            {tabs.map(t => (
              <button key={t.id} className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
                {t.count !== undefined && <span className={styles.tabCount}>{t.count}</span>}
              </button>
            ))}
          </nav>

          {tab === 'geral' && renderOverview()}
          {tab === 'modelos' && <ModelosTab models={models} ideas={ideas} onChange={fetchData} />}
          {tab === 'inspiracoes' && <InspiracoesTab inspirations={inspirations} models={models} onChange={fetchData} />}
          {tab === 'tempestade' && <TempestadeTab ideas={ideas} onEdit={idea => openIdea(idea)} onChange={fetchData} />}
          {tab === 'banco' && <BancoTab ideas={ideas} models={models} onNew={() => openIdea(null, 'pronta')} onEdit={openIdea} onChange={fetchData} />}
          {tab === 'publicados' && <PublicadosTab ideas={ideas} models={models} onEdit={idea => openIdea(idea)} onNew={() => openIdea(null, 'publicado')} onChange={fetchData} />}
        </>
      )}

      <IdeaModal
        key={ideaModal.key}
        isOpen={ideaModal.open}
        idea={ideaModal.idea}
        status={ideaModal.status}
        models={models}
        inspirations={inspirations}
        onClose={() => setIdeaModal(prev => ({ ...prev, open: false }))}
        onSaved={fetchData}
        typeEnabled={ideas.length === 0 || 'production_type' in ideas[0]}
      />
    </div>
  );
}
