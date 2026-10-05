"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/Toast';
import { confirmAction } from '@/components/ConfirmDialog';
import styles from '../instagram.module.css';
import { IgIdea, IgModel, formatDate, formatLabel, formatNumber, performanceOptions, performed } from '../types';
import { EditIcon, LinkIcon, TrashIcon } from './icons';

interface Props {
  ideas: IgIdea[];
  models: IgModel[];
  onEdit: (idea: IgIdea) => void;
  onNew: () => void;
  onChange: () => void;
}

type SortKey = 'published_at' | 'views' | 'saves' | 'shares' | 'follows';

const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'published_at', label: 'Mais recentes' },
  { value: 'views', label: 'Mais views' },
  { value: 'saves', label: 'Mais salvos' },
  { value: 'shares', label: 'Mais compartilhados' },
  { value: 'follows', label: 'Mais seguidores' },
];

export default function PublicadosTab({ ideas, models, onEdit, onNew, onChange }: Props) {
  const [onlyHits, setOnlyHits] = useState(false);
  const [sort, setSort] = useState<SortKey>('published_at');
  const [modelFilter, setModelFilter] = useState('');

  const posts = ideas
    .filter(i => i.status === 'publicado')
    .filter(i => !onlyHits || performed(i))
    .filter(i => !modelFilter || i.model_id === modelFilter)
    .sort((a, b) => {
      if (sort === 'published_at') return (b.published_at ?? '').localeCompare(a.published_at ?? '');
      return (b[sort] ?? -1) - (a[sort] ?? -1);
    });

  const handleDelete = async (id: string) => {
    if (!(await confirmAction({ title: 'Deletar post do histórico?', message: 'O registro e as métricas deste post serão apagados.', confirmLabel: 'Deletar', danger: true }))) return;
    const { error } = await supabase.from('ig_ideas').delete().eq('id', id);
    if (error) showToast('Erro ao deletar.', 'error');
    else showToast('Post removido.', 'info');
    onChange();
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Publicados</h2>
          <p className={styles.sectionHint}>Ideias que viraram post, com métricas e o que você aprendeu.</p>
        </div>
        <div className={styles.filters}>
          <label className={styles.toggle}>
            <input type="checkbox" checked={onlyHits} onChange={e => setOnlyHits(e.target.checked)} />
            Só os que performaram
          </label>
          <select value={modelFilter} onChange={e => setModelFilter(e.target.value)}>
            <option value="">Todos os modelos</option>
            {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select value={sort} onChange={e => setSort(e.target.value as SortKey)}>
            {sortOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button className="btn btn-primary" onClick={onNew}>+ Registrar post</button>
        </div>
      </div>

      {posts.length === 0 ? (
        <div className={styles.empty}>
          {onlyHits || modelFilter ? 'Nenhum post com esse filtro.' : 'Nenhum post registrado. No banco de ideias, clique em “Publiquei” quando um post for ao ar.'}
        </div>
      ) : (
        <div className={styles.grid}>
          {posts.map(post => {
            const model = models.find(m => m.id === post.model_id);
            const perf = performanceOptions.find(p => p.value === post.performance);
            return (
              <div key={post.id} className={`${styles.card} ${performed(post) ? styles.cardMain : ''} glass-panel`}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>{post.title}</span>
                  <div className={styles.actions}>
                    <button className={styles.iconBtn} onClick={() => onEdit(post)} title="Editar métricas"><EditIcon /></button>
                    <button className={`${styles.iconBtn} ${styles.deleteIconBtn}`} onClick={() => handleDelete(post.id)} title="Deletar"><TrashIcon /></button>
                  </div>
                </div>
                <div className={styles.badges}>
                  {perf ? <span className={`badge ${perf.badge}`}>{perf.label}</span> : <span className="badge badge-amber">Avaliando</span>}
                  {post.format && <span className="badge badge-purple">{formatLabel(post.format)}</span>}
                  {model && <span className="badge badge-green">{model.name}</span>}
                </div>
                <p className={styles.rowMeta}>{formatDate(post.published_at)}{post.pillar ? ` · ${post.pillar}` : ''}</p>
                <div className={styles.metrics}>
                  {[
                    ['Views', post.views], ['Curtidas', post.likes], ['Coment.', post.comments],
                    ['Salvos', post.saves], ['Compart.', post.shares], ['Seguid.', post.follows],
                  ].map(([label, value]) => (
                    <div key={label as string} className={styles.metric}>
                      <span className={styles.metricValue}>{formatNumber(value as number | null)}</span>
                      <span className={styles.metricLabel}>{label}</span>
                    </div>
                  ))}
                </div>
                {post.learnings && <p className={styles.learnings}>💡 {post.learnings}</p>}
                {post.post_url && (
                  <a href={post.post_url} target="_blank" rel="noreferrer" className={styles.link}><LinkIcon /> Ver no Instagram</a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
