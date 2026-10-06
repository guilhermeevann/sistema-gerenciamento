"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/Toast';
import { confirmAction } from '@/components/ConfirmDialog';
import styles from '../instagram.module.css';
import { IdeaStatus, IgIdea, IgModel, byPriority, formatLabel, matchesSearch, priorityLevels } from '../types';
import { ArrowIcon, BackIcon, EditIcon, TrashIcon } from './icons';

interface Props {
  ideas: IgIdea[];
  models: IgModel[];
  onNew: () => void;
  onEdit: (idea: IgIdea, status?: IdeaStatus) => void;
  onChange: () => void;
}

const MIGRATION_HINT = 'Falta rodar supabase/ig_prioridade.sql no Supabase.';

export default function BancoTab({ ideas, models, onNew, onEdit, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  // As colunas de prioridade só existem depois do SQL; sem elas a ordenação fica desligada.
  const hasPriority = ideas.length === 0 || 'priority' in ideas[0];

  const ready = ideas.filter(i => i.status === 'pronta').sort(byPriority);
  const inProduction = ideas.filter(i => i.status === 'producao').sort(byPriority);

  const move = async (id: string, status: IdeaStatus) => {
    const { error } = await supabase.from('ig_ideas').update({ status }).eq('id', id);
    if (error) showToast('Erro ao mover ideia.', 'error');
    onChange();
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAction({ title: 'Deletar ideia?', message: 'A ideia e o roteiro dela serão apagados.', confirmLabel: 'Deletar', danger: true }))) return;
    const { error } = await supabase.from('ig_ideas').delete().eq('id', id);
    if (error) showToast('Erro ao deletar.', 'error');
    else showToast('Ideia removida.', 'info');
    onChange();
  };

  const runUpdates = async (updates: { id: string; data: Partial<IgIdea> }[], okMessage?: string) => {
    if (busy || updates.length === 0) return;
    setBusy(true);
    const results = await Promise.all(updates.map(u => supabase.from('ig_ideas').update(u.data).eq('id', u.id)));
    setBusy(false);
    const failed = results.find(r => r.error);
    if (failed) showToast(failed.error?.code === 'PGRST204' ? MIGRATION_HINT : 'Não foi possível reordenar.', 'error');
    else if (okMessage) showToast(okMessage);
    onChange();
  };

  const setPriority = (idea: IgIdea, priority: number) => {
    if ((idea.priority ?? 2) === priority) return;
    // Entra no fim da nova faixa.
    const last = Math.max(0, ...ready.filter(i => (i.priority ?? 2) === priority).map(i => i.sort_order ?? 0));
    const label = priorityLevels.find(p => p.value === priority)?.label;
    runUpdates([{ id: idea.id, data: { priority, sort_order: last + 1 } }], `Movida para ${label}`);
  };

  // Move para a posição `target` dentro da faixa (vizinha, topo ou fim) e renumera a faixa (1..n).
  const reorder = (group: IgIdea[], index: number, target: number) => {
    if (target < 0 || target >= group.length || target === index) return;
    const ordered = [...group];
    const [moved] = ordered.splice(index, 1);
    ordered.splice(target, 0, moved);
    runUpdates(
      ordered
        .map((idea, i) => ({ idea, order: i + 1 }))
        .filter(({ idea, order }) => idea.sort_order !== order)
        .map(({ idea, order }) => ({ id: idea.id, data: { sort_order: order } }))
    );
  };

  const renderCard = (idea: IgIdea, reorderCtx?: { group: IgIdea[]; index: number }) => {
    const model = models.find(m => m.id === idea.model_id);
    const isReady = idea.status === 'pronta';
    const group = reorderCtx?.group ?? [];
    const index = reorderCtx?.index ?? 0;
    const isFirst = index === 0;
    const isLast = index === group.length - 1;
    return (
      <div key={idea.id} className={`${styles.card} ${idea.priority === 1 && isReady ? styles.cardUrgent : ''} glass-panel`}>
        <div className={styles.cardHeader}>
          {reorderCtx && hasPriority && !query && (
            <div className={styles.reorder}>
              <button className={styles.iconBtn} disabled={busy || isFirst} onClick={() => reorder(group, index, 0)} title="Mandar para o topo" aria-label="Mandar para o topo">⤒</button>
              <button className={styles.iconBtn} disabled={busy || isFirst} onClick={() => reorder(group, index, index - 1)} title="Subir" aria-label="Subir">▲</button>
              <button className={styles.iconBtn} disabled={busy || isLast} onClick={() => reorder(group, index, index + 1)} title="Descer" aria-label="Descer">▼</button>
              <button className={styles.iconBtn} disabled={busy || isLast} onClick={() => reorder(group, index, group.length - 1)} title="Mandar para o fim" aria-label="Mandar para o fim">⤓</button>
            </div>
          )}
          <button className={styles.cardTitleBtn} onClick={() => onEdit(idea)} title="Abrir ideia">{idea.title}</button>
          <div className={styles.actions}>
            <button className={styles.iconBtn} onClick={() => onEdit(idea)} title="Editar"><EditIcon /></button>
            <button className={`${styles.iconBtn} ${styles.deleteIconBtn}`} onClick={() => handleDelete(idea.id)} title="Deletar"><TrashIcon /></button>
          </div>
        </div>
        {(idea.format || model || idea.pillar) && (
          <div className={styles.badges}>
            {idea.format && <span className="badge badge-purple">{formatLabel(idea.format)}</span>}
            {model && <span className="badge badge-green">{model.name}</span>}
            {idea.pillar && <span className="badge badge-blue">{idea.pillar}</span>}
          </div>
        )}
        {idea.hook && <p className={styles.hook}>“{idea.hook}”</p>}
        {idea.description && <p className={`${styles.cardText} ${styles.clamp}`}>{idea.description}</p>}

        {isReady && hasPriority && (
          <div className={styles.priorityPicker} role="radiogroup" aria-label="Prioridade">
            {priorityLevels.map(p => (
              <button
                key={p.value}
                role="radio"
                aria-checked={(idea.priority ?? 2) === p.value}
                className={`${styles.priorityOption} ${(idea.priority ?? 2) === p.value ? styles[`priority${p.value}`] : ''}`}
                onClick={() => setPriority(idea, p.value)}
                disabled={busy}
              >
                {p.short}
              </button>
            ))}
          </div>
        )}

        <div className={styles.cardFooter}>
          {isReady ? (
            <>
              <button className={`btn btn-secondary ${styles.smallBtn}`} onClick={() => move(idea.id, 'brainstorm')}><BackIcon /> Tempestade</button>
              <button className={`btn btn-secondary ${styles.smallBtn}`} onClick={() => move(idea.id, 'producao')}>Produzir <ArrowIcon /></button>
            </>
          ) : (
            <>
              <button className={`btn btn-secondary ${styles.smallBtn}`} onClick={() => move(idea.id, 'pronta')}><BackIcon /> Pronta</button>
              <button className={`btn btn-primary ${styles.smallBtn}`} onClick={() => onEdit(idea, 'publicado')}>📤 Publiquei</button>
            </>
          )}
        </div>
      </div>
    );
  };

  const readyVisible = ready.filter(i => matchesSearch(i, query));
  const productionVisible = inProduction.filter(i => matchesSearch(i, query));

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Banco de ideias</h2>
          <p className={styles.sectionHint}>Tudo que ainda não virou post. Priorize o que vai gravar primeiro; ▲▼ move uma posição, ⤒⤓ manda direto pro topo ou pro fim.</p>
        </div>
        <button className="btn btn-primary" onClick={onNew}>+ Nova ideia</button>
      </div>

      <input className={styles.search} type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por título, gancho, roteiro ou pilar..." />

      <div className={styles.board}>
        <div className={styles.column}>
          <div className={styles.columnTitle}>
            <span>✅ Pronta pra produzir</span>
            <span className={styles.tabCount}>{readyVisible.length}</span>
          </div>
          {!hasPriority && <div className={styles.empty}>Para priorizar e ordenar, rode <code>supabase/ig_prioridade.sql</code> no SQL Editor do Supabase.</div>}
          {readyVisible.length === 0 && <div className={styles.empty}>{query ? 'Nada com essa busca.' : 'Ideia validada, ainda não virou post'}</div>}

          {hasPriority
            ? priorityLevels.map(level => {
                const group = ready.filter(i => (i.priority ?? 2) === level.value);
                const visible = group.filter(i => matchesSearch(i, query));
                if (visible.length === 0) return null;
                return (
                  <div key={level.value} className={styles.priorityGroup}>
                    <div className={styles.priorityHeader}>
                      <span>{level.label}</span>
                      <span className={styles.tabCount}>{visible.length}</span>
                    </div>
                    {visible.map(idea => renderCard(idea, { group, index: group.indexOf(idea) }))}
                  </div>
                );
              })
            : readyVisible.map(idea => renderCard(idea))}
        </div>

        <div className={styles.column}>
          <div className={styles.columnTitle}>
            <span>🎬 Em produção</span>
            <span className={styles.tabCount}>{productionVisible.length}</span>
          </div>
          {productionVisible.length === 0 && <div className={styles.empty}>{query ? 'Nada com essa busca.' : 'Gravando, editando ou montando'}</div>}
          {productionVisible.map(idea => renderCard(idea))}
        </div>
      </div>
    </section>
  );
}
