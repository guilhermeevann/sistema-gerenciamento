"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './metas.module.css';
import Modal from '@/components/Modal';
import { showToast } from '@/components/Toast';

export default function Metas() {
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [focusLevel, setFocusLevel] = useState(3);
  const [isEditing, setIsEditing] = useState<string | null>(null);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .order('completed', { ascending: true })
      .order('focus_level', { ascending: false });
    if (error) { showToast('Erro ao carregar metas.', 'error'); }
    else if (data) setGoals(data);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    const payload = { title: title.trim(), description: description.trim(), focus_level: focusLevel };

    if (isEditing) {
      const { error } = await supabase.from('goals').update(payload).eq('id', isEditing);
      if (error) showToast('Erro ao atualizar meta.', 'error');
      else showToast('Meta atualizada!');
    } else {
      const { error } = await supabase.from('goals').insert([payload]);
      if (error) showToast('Erro ao criar meta.', 'error');
      else showToast('Meta criada com sucesso!');
    }

    setSaving(false);
    resetForm();
    fetchGoals();
  };

  const handleToggleComplete = async (goal: any) => {
    const newStatus = !goal.completed;
    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, completed: newStatus } : g));
    await supabase.from('goals').update({ completed: newStatus }).eq('id', goal.id);
    showToast(newStatus ? 'Meta concluída! 🎉' : 'Meta reaberta.', newStatus ? 'success' : 'info');
    fetchGoals(); // re-sort
  };

  const handleEdit = (goal: any) => {
    setTitle(goal.title);
    setDescription(goal.description || '');
    setFocusLevel(goal.focus_level);
    setIsEditing(goal.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar esta meta?')) return;
    const { error } = await supabase.from('goals').delete().eq('id', id);
    if (error) showToast('Erro ao deletar.', 'error');
    else showToast('Meta deletada.', 'info');
    fetchGoals();
  };

  const handleClearAll = async () => {
    if (!confirm('Deletar TODAS as metas? Esta ação não pode ser desfeita.')) return;
    const { error } = await supabase.from('goals').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) showToast('Erro ao limpar.', 'error');
    else showToast('Todas as metas foram removidas.', 'info');
    fetchGoals();
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setFocusLevel(3);
    setIsEditing(null);
    setIsModalOpen(false);
  };

  const active = goals.filter(g => !g.completed);
  const completed = goals.filter(g => g.completed);

  const GoalCard = ({ goal }: { goal: any }) => (
    <div className={`${styles.goalCard} glass-panel ${goal.completed ? styles.goalCompleted : ''}`}>
      <div className={styles.goalCardHeader}>
        <div className={styles.goalTitleRow}>
          <button
            className={`${styles.checkbox} ${goal.completed ? styles.checkboxActive : ''}`}
            onClick={() => handleToggleComplete(goal)}
            title={goal.completed ? 'Reabrir meta' : 'Marcar como concluída'}
          >
            {goal.completed && (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M10 3L4.5 8.5L2 6" stroke="#0b0f19" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          <h3 className={styles.goalTitle}>{goal.title}</h3>
        </div>
        <div className={styles.goalMeta}>
          <span className={`badge ${goal.focus_level >= 4 ? 'badge-amber' : goal.focus_level >= 3 ? 'badge-blue' : 'badge-purple'}`}>
            Foco {goal.focus_level}
          </span>
        </div>
      </div>

      {goal.description && <p className={styles.goalDesc}>{goal.description}</p>}
      
      <div className={styles.goalActions}>
        <button className={`${styles.actionBtn} ${styles.editBtn}`} onClick={() => handleEdit(goal)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Editar
        </button>
        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(goal.id)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
          </svg>
          Deletar
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className="h2">Gerenciamento de Metas</h1>
          <p className="text-secondary">Defina e acompanhe seus objetivos de foco principal.</p>
        </div>
        <div className={styles.headerActions}>
          {goals.length > 0 && (
            <button className="btn btn-danger" onClick={handleClearAll} style={{ fontSize: '0.85rem' }}>
              Limpar Tudo
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            + Nova Meta
          </button>
        </div>
      </header>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <span className="text-secondary">Carregando metas...</span>
          </div>
        ) : goals.length === 0 ? (
          <div className={`${styles.emptyState} glass-panel`}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
              <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
            </svg>
            <p>Nenhuma meta definida ainda.</p>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              Criar primeira meta
            </button>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section className={styles.listSection}>
                <h2 className={styles.sectionLabel}>Em Andamento ({active.length})</h2>
                <div className={styles.goalsGrid}>
                  {active.map(goal => <GoalCard key={goal.id} goal={goal} />)}
                </div>
              </section>
            )}
            {completed.length > 0 && (
              <section className={styles.listSection}>
                <h2 className={styles.sectionLabel} style={{ color: 'var(--accent-success)' }}>
                  Concluídas ({completed.length})
                </h2>
                <div className={styles.goalsGrid}>
                  {completed.map(goal => <GoalCard key={goal.id} goal={goal} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={resetForm} title={isEditing ? 'Editar Meta' : 'Nova Meta'}>
        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Título *</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              placeholder="Ex: Ler a Bíblia toda em 1 ano"
              required
              autoFocus
            />
          </div>
          <div className={styles.formGroup}>
            <label>Descrição</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="Detalhes e estratégia para atingir esta meta..."
              rows={3}
            />
          </div>
          <div className={styles.formGroup}>
            <label>Nível de Foco — {focusLevel}/5</label>
            <input 
              type="range" 
              min="1" max="5" 
              value={focusLevel} 
              onChange={e => setFocusLevel(Number(e.target.value))} 
            />
            <div className={styles.focusLabels}>
              <span>Baixo</span><span>Alto</span>
            </div>
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={saving}>
            {saving ? 'Salvando...' : isEditing ? 'Atualizar Meta' : 'Adicionar Meta'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
