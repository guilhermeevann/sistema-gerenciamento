"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/Toast';
import { confirmAction } from '@/components/ConfirmDialog';
import styles from '../instagram.module.css';
import { IdeaStatus, IgIdea, IgModel, ProductionType, byPriority, formatLabel, matchesSearch, priorityLevels, productionTypes } from '../types';
import { ArrowIcon, BackIcon, EditIcon, TrashIcon } from './icons';
import ScriptReader from './ScriptReader';

interface Props {
  ideas: IgIdea[];
  models: IgModel[];
  onNew: () => void;
  onEdit: (idea: IgIdea, status?: IdeaStatus) => void;
  onChange: () => void;
}

const MIGRATION_HINT = 'Falta rodar um SQL de supabase/ no Supabase.';

type TypeFilter = 'todos' | ProductionType | 'sem';
const FILTER_KEY = 'banco-tipo';

const typeClass: Record<ProductionType, string> = {
  rapido: 'typeRapido',
  fundo: 'typeFundo',
  roteiro: 'typeRoteiro',
};

export default function BancoTab({ ideas, models, onNew, onEdit, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('todos');

  // Lembra o filtro de tipo entre visitas.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FILTER_KEY) as TypeFilter | null;
      if (saved) setTypeFilter(saved);
    } catch {}
  }, []);

  const chooseFilter = (value: TypeFilter) => {
    setTypeFilter(value);
    try { localStorage.setItem(FILTER_KEY, value); } catch {}
  };

  // As colunas de prioridade só existem depois do SQL; sem elas a ordenação fica desligada.
  const hasPriority = ideas.length === 0 || 'priority' in ideas[0];

  const hasType = ideas.length === 0 || 'production_type' in ideas[0];
  const matchesType = (idea: IgIdea) =>
    !hasType || typeFilter === 'todos' ||
    (typeFilter === 'sem' ? !idea.production_type : idea.production_type === typeFilter);

  const allReady = ideas.filter(i => i.status === 'pronta');
  const ready = allReady.filter(matchesType).sort(byPriority);
  const inProduction = ideas.filter(i => i.status === 'producao').filter(matchesType).sort(byPriority);

  const typeCounts = {
    todos: allReady.length,
    sem: allReady.filter(i => !i.production_type).length,
    ...Object.fromEntries(productionTypes.map(t => [t.value, allReady.filter(i => i.production_type === t.value).length])),
  } as Record<TypeFilter, number>;

  // Fila de leitura na ordem de gravação: em produção, depois prontas por prioridade.
  const readingQueue = [...inProduction, ...ready].filter(i => i.hook || i.description);
  const readingIndex = readingQueue.findIndex(i => i.id === readingId);

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

  const setType = (idea: IgIdea, production_type: ProductionType) => {
    const label = productionTypes.find(t => t.value === production_type)?.label;
    runUpdates([{ id: idea.id, data: { production_type } }], `Classificada como ${label}`);
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
      <div
        key={idea.id}
        className={`${styles.card} ${idea.production_type ? styles[typeClass[idea.production_type]] : ''} ${idea.priority === 1 && isReady ? styles.cardUrgent : ''} glass-panel`}
      >
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
        {(idea.production_type || idea.format || model || idea.pillar) && (
          <div className={styles.badges}>
            {idea.production_type && (
              <span className={`${styles.typeBadge} ${styles[`${typeClass[idea.production_type]}Badge`]}`}>
                {productionTypes.find(t => t.value === idea.production_type)?.label}
              </span>
            )}
            {idea.format && <span className="badge badge-purple">{formatLabel(idea.format)}</span>}
            {model && <span className="badge badge-green">{model.name}</span>}
            {idea.pillar && <span className="badge badge-blue">{idea.pillar}</span>}
          </div>
        )}
        {idea.hook && <p className={styles.hook}>“{idea.hook}”</p>}
        {idea.description && <p className={`${styles.cardText} ${styles.clamp}`}>{idea.description}</p>}

        {hasType && !idea.production_type && (
          <div className={styles.classify}>
            <span>Tipo:</span>
            {productionTypes.map(t => (
              <button key={t.value} className={styles.classifyBtn} onClick={() => setType(idea, t.value)} disabled={busy} title={t.hint}>
                {t.short}
              </button>
            ))}
          </div>
        )}

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
          {(idea.hook || idea.description) && (
            <button className={`btn ${styles.readBtn} ${styles.smallBtn}`} onClick={() => setReadingId(idea.id)}>📖 Ler roteiro</button>
          )}
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

      {hasType ? (
        <div className={styles.typeFilter} role="tablist" aria-label="Tipo de produção">
          {([
            { value: 'todos', label: 'Todos', hint: 'Todas as ideias prontas' },
            ...productionTypes,
            ...(typeCounts.sem > 0 ? [{ value: 'sem', label: '❔ Sem tipo', hint: 'Ainda não classificadas' }] : []),
          ] as { value: TypeFilter; label: string; hint: string }[]).map(t => (
            <button
              key={t.value}
              role="tab"
              aria-selected={typeFilter === t.value}
              className={`${styles.typeTab} ${typeFilter === t.value ? styles.typeTabActive : ''} ${t.value in typeClass ? styles[`${typeClass[t.value as ProductionType]}Tab`] : ''}`}
              onClick={() => chooseFilter(t.value)}
              title={t.hint}
            >
              {t.label}
              <span className={styles.tabCount}>{typeCounts[t.value] ?? 0}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>Para separar por tipo de produção (rápido 7s, fundo, roteiro), rode <code>supabase/ig_tipo_producao.sql</code> no SQL Editor do Supabase.</div>
      )}

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
      {readingIndex >= 0 && (
        <ScriptReader
          ideas={readingQueue}
          index={readingIndex}
          onIndexChange={i => setReadingId(readingQueue[i]?.id ?? null)}
          onClose={() => setReadingId(null)}
        />
      )}
    </section>
  );
}
