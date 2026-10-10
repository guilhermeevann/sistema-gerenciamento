"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { showToast } from '@/components/Toast';
import { confirmAction } from '@/components/ConfirmDialog';
import styles from '../instagram.module.css';
import { IgIdea, formatLabel, matchesSearch, productionTypeLabel } from '../types';
import { ArrowIcon, EditIcon, TrashIcon } from './icons';

interface Props {
  ideas: IgIdea[];
  onEdit: (idea: IgIdea) => void;
  onChange: () => void;
}

export default function TempestadeTab({ ideas, onEdit, onChange }: Props) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');

  const all = ideas.filter(i => i.status === 'brainstorm');
  const brainstorm = all.filter(i => matchesSearch(i, query));

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('ig_ideas').insert([{ title: text.trim(), status: 'brainstorm' }]);
    setSaving(false);
    if (error) { showToast('Erro ao salvar ideia.', 'error'); return; }
    setText('');
    onChange();
  };

  const promote = async (id: string) => {
    const { error } = await supabase.from('ig_ideas').update({ status: 'pronta' }).eq('id', id);
    if (error) showToast('Erro ao mover ideia.', 'error');
    else showToast('Foi para o banco de ideias!');
    onChange();
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAction({ title: 'Descartar ideia?', confirmLabel: 'Descartar', danger: true }))) return;
    const { error } = await supabase.from('ig_ideas').delete().eq('id', id);
    if (error) showToast('Erro ao deletar.', 'error');
    onChange();
  };

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Tempestade de ideias</h2>
          <p className={styles.sectionHint}>Joga tudo aqui sem filtro. Enter salva. Depois escolhe o que vale ir pro banco.</p>
        </div>
      </div>

      <form onSubmit={handleAdd} className={styles.quickAdd}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Uma ideia de post..." autoFocus />
        <button type="submit" className="btn btn-primary" disabled={saving}>Anotar</button>
      </form>

      {all.length > 5 && (
        <input className={styles.search} type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={`Buscar em ${all.length} ideias...`} />
      )}

      {brainstorm.length === 0 ? (
        <div className={styles.empty}>{query ? 'Nenhuma ideia com essa busca.' : 'Nenhuma ideia solta. A cabeça está vazia ou já foi tudo pro banco 😄'}</div>
      ) : (
        <div className={styles.brainList}>
          {brainstorm.map(idea => (
            <div key={idea.id} className={`${styles.brainItem} glass-panel`}>
              <button className={styles.brainText} onClick={() => onEdit(idea)} title="Abrir ideia">
                {idea.title}
                {(idea.production_type || idea.format || idea.pillar || idea.description) && (
                  <span className={styles.brainMeta}>
                    {[productionTypeLabel(idea.production_type), idea.format && formatLabel(idea.format), idea.pillar].filter(Boolean).join(' · ')}
                    {idea.description && <span className={styles.scriptTag}>📝 roteiro</span>}
                  </span>
                )}
              </button>
              <span className={styles.rowMeta}>
                {new Date(idea.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              </span>
              <div className={styles.actions}>
                <button className={styles.iconBtn} onClick={() => onEdit(idea)} title="Detalhar"><EditIcon /></button>
                <button className={styles.iconBtn} onClick={() => promote(idea.id)} title="Mandar pro banco de ideias"><ArrowIcon /></button>
                <button className={`${styles.iconBtn} ${styles.deleteIconBtn}`} onClick={() => handleDelete(idea.id)} title="Descartar"><TrashIcon /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
