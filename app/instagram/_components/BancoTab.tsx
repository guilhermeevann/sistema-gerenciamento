"use client";

import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/Toast';
import styles from '../instagram.module.css';
import { IdeaStatus, IgIdea, IgModel, formatLabel } from '../types';
import { ArrowIcon, BackIcon, EditIcon, TrashIcon } from './icons';

interface Props {
  ideas: IgIdea[];
  models: IgModel[];
  onNew: () => void;
  onEdit: (idea: IgIdea, status?: IdeaStatus) => void;
  onChange: () => void;
}

const columns: { status: IdeaStatus; title: string; hint: string }[] = [
  { status: 'pronta', title: '✅ Pronta pra produzir', hint: 'Ideia validada, ainda não virou post' },
  { status: 'producao', title: '🎬 Em produção', hint: 'Gravando, editando ou montando' },
];

export default function BancoTab({ ideas, models, onNew, onEdit, onChange }: Props) {
  const move = async (id: string, status: IdeaStatus) => {
    const { error } = await supabase.from('ig_ideas').update({ status }).eq('id', id);
    if (error) showToast('Erro ao mover ideia.', 'error');
    onChange();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deletar esta ideia?')) return;
    const { error } = await supabase.from('ig_ideas').delete().eq('id', id);
    if (error) showToast('Erro ao deletar.', 'error');
    else showToast('Ideia removida.', 'info');
    onChange();
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Banco de ideias</h2>
          <p className={styles.sectionHint}>Tudo que ainda não virou post. Quando publicar, registre o post e as métricas.</p>
        </div>
        <button className="btn btn-primary" onClick={onNew}>+ Nova ideia</button>
      </div>

      <div className={styles.board}>
        {columns.map(col => {
          const items = ideas.filter(i => i.status === col.status);
          return (
            <div key={col.status} className={styles.column}>
              <div className={styles.columnTitle}>
                <span>{col.title}</span>
                <span className={styles.tabCount}>{items.length}</span>
              </div>
              {items.length === 0 && <div className={styles.empty}>{col.hint}</div>}
              {items.map(idea => {
                const model = models.find(m => m.id === idea.model_id);
                return (
                  <div key={idea.id} className={`${styles.card} glass-panel`}>
                    <div className={styles.cardHeader}>
                      <span className={styles.cardTitle}>{idea.title}</span>
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
                    {idea.description && <p className={styles.cardText}>{idea.description}</p>}
                    <div className={styles.cardFooter}>
                      {col.status === 'pronta' ? (
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
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
