"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { todayLocal } from '@/lib/date';
import styles from './page.module.css';
import Modal from '@/components/Modal';
import { showToast } from '@/components/Toast';
import { confirmAction } from '@/components/ConfirmDialog';

const CheckMark = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M10 3L4.5 8.5L2 6" stroke="#0b0f19" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function Home() {
  const [goals, setGoals] = useState<any[]>([]);
  const [weeklyWords, setWeeklyWords] = useState<any[]>([]);
  const [routineTasks, setRoutineTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Word Modal State
  const [isWordModalOpen, setIsWordModalOpen] = useState(false);
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editWord, setEditWord] = useState('');
  const [editWordDesc, setEditWordDesc] = useState('');
  const [savingWord, setSavingWord] = useState(false);

  const fetchWords = async () => {
    const { data, error } = await supabase
      .from('weekly_words')
      .select('*')
      .order('week_start', { ascending: false });
    if (error) showToast('Erro ao carregar palavras.', 'error');
    else setWeeklyWords(data ?? []);
  };

  const fetchDashboardData = async () => {
    const [goalsRes, tasksRes] = await Promise.all([
      supabase
        .from('goals')
        .select('*')
        .or('completed.is.null,completed.eq.false')
        .order('focus_level', { ascending: false })
        .limit(3),
      supabase
        .from('tasks')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
      fetchWords(),
    ]);

    if (goalsRes.error || tasksRes.error) showToast('Erro ao carregar o painel.', 'error');
    setGoals(goalsRes.data ?? []);

    const todayIndex = new Date().getDay();
    setRoutineTasks((tasksRes.data ?? []).filter(t =>
      t.type === 'recurring' ||
      (t.type === 'extra' && t.day_of_week === todayIndex) ||
      (t.type === 'weekly' && Array.isArray(t.days_of_week) && t.days_of_week.includes(todayIndex))
    ));

    setLoading(false);
  };

  useEffect(() => { fetchDashboardData(); }, []);

  const openNewWordModal = () => {
    setEditingWordId(null);
    setEditWord('');
    setEditWordDesc('');
    setIsWordModalOpen(true);
  };

  const openEditWordModal = (word: any) => {
    setEditingWordId(word.id);
    setEditWord(word.word || '');
    setEditWordDesc(word.description || '');
    setIsWordModalOpen(true);
  };

  const handleSaveWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editWord.trim()) return;
    setSavingWord(true);

    const payload = { word: editWord.trim(), description: editWordDesc.trim() || null };
    const { error } = editingWordId
      ? await supabase.from('weekly_words').update(payload).eq('id', editingWordId)
      : await supabase.from('weekly_words').insert([{ ...payload, week_start: todayLocal() }]);

    setSavingWord(false);

    if (error) {
      showToast(`Erro: ${error.message}`, 'error');
      return;
    }

    showToast(editingWordId ? 'Palavra atualizada!' : 'Nova palavra adicionada!');
    setIsWordModalOpen(false);
    fetchWords();
  };

  const handleDeleteWord = async (word: any) => {
    const ok = await confirmAction({
      title: 'Deletar palavra?',
      message: `"${word.word}" será removida.`,
      confirmLabel: 'Deletar',
      danger: true,
    });
    if (!ok) return;
    const { error } = await supabase.from('weekly_words').delete().eq('id', word.id);
    if (error) showToast(`Erro: ${error.message}`, 'error');
    else { showToast('Palavra removida.', 'info'); fetchWords(); }
  };

  const toggleTaskCompletion = async (task: any) => {
    const todayStr = todayLocal();
    const isCompletedToday = task.date === todayStr && task.is_completed;
    const newStatus = !isCompletedToday;
    const newDate = newStatus ? todayStr : null;

    setRoutineTasks(prev => prev.map(t =>
      t.id === task.id ? { ...t, is_completed: newStatus, date: newDate } : t
    ));

    const { error } = await supabase
      .from('tasks')
      .update({ is_completed: newStatus, date: newDate })
      .eq('id', task.id);

    if (error) {
      setRoutineTasks(prev => prev.map(t => t.id === task.id ? task : t));
      showToast('Não foi possível salvar. Tente de novo.', 'error');
    }
  };

  const toggleGoal = async (goal: any) => {
    const newStatus = !goal.completed;
    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, completed: newStatus } : g));
    const { error } = await supabase.from('goals').update({ completed: newStatus }).eq('id', goal.id);
    if (error) {
      setGoals(prev => prev.map(g => g.id === goal.id ? goal : g));
      showToast('Não foi possível salvar. Tente de novo.', 'error');
    } else if (newStatus) {
      showToast('Meta concluída! 🎉');
    }
  };

  if (loading) {
    return <div className="page-loading">Carregando painel...</div>;
  }

  const todayStr = todayLocal();
  const doneCount = routineTasks.filter(t => t.is_completed && t.date === todayStr).length;
  const progress = routineTasks.length ? Math.round((doneCount / routineTasks.length) * 100) : 0;
  const todayLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <p className={styles.dateLabel}>{todayLabel}</p>
        <h1 className="h2">Olá, Guilherme.</h1>
        <p className="text-secondary">O que vamos construir hoje?</p>
      </header>

      {/* Palavras da Semana */}
      <section className={styles.wordsSection}>
        <div className={styles.wordsSectionHeader}>
          <div>
            <span className={styles.wordTitle}>Palavras da Semana</span>
            <span className={styles.wordsCount}>{weeklyWords.length} palavra{weeklyWords.length !== 1 ? 's' : ''}</span>
          </div>
          <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '6px 14px' }} onClick={openNewWordModal}>
            + Nova Palavra
          </button>
        </div>

        {weeklyWords.length === 0 ? (
          <div className={`${styles.weeklyWord} glass-panel`}>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>Nenhuma palavra adicionada ainda.</p>
          </div>
        ) : (
          <div className={styles.wordsGrid}>
            {weeklyWords.map(word => (
              <div key={word.id} className={`${styles.weeklyWord} glass-panel`}>
                <p className={styles.wordContent}>&ldquo;{word.word}&rdquo;</p>
                {word.description && (
                  <p className="text-secondary" style={{ fontSize: '0.9rem' }}>{word.description}</p>
                )}
                <div className={styles.wordActions}>
                  <button className={styles.wordActionBtn} onClick={() => openEditWordModal(word)} title="Editar">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                    Editar
                  </button>
                  <button className={`${styles.wordActionBtn} ${styles.wordDeleteBtn}`} onClick={() => handleDeleteWord(word)} title="Deletar">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                    </svg>
                    Deletar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className={styles.grid}>
        {/* Checklist Diário */}
        <section className={styles.routineSection}>
          <div className={`${styles.routineCard} glass-panel`}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className="h3">Rotina de Hoje</h2>
                <p className="text-secondary" style={{ fontSize: '0.9rem' }}>O que fizemos hoje?</p>
              </div>
              <Link href="/tarefas" className={styles.sectionLink}>Gerenciar →</Link>
            </div>

            <div className={styles.checklist}>
              {routineTasks.length === 0 ? (
                <p className="text-muted" style={{ fontSize: '0.9rem' }}>
                  Nada programado para hoje. <Link href="/tarefas" className={styles.sectionLink}>Adicionar tarefa</Link>
                </p>
              ) : (
                routineTasks.map(task => {
                  const isCompletedToday = task.is_completed && task.date === todayStr;
                  return (
                    <button
                      key={task.id}
                      type="button"
                      role="checkbox"
                      aria-checked={isCompletedToday}
                      className={`${styles.checkItem} ${isCompletedToday ? styles.completed : ''}`}
                      onClick={() => toggleTaskCompletion(task)}
                    >
                      <span className={styles.checkbox}>{isCompletedToday && <CheckMark />}</span>
                      <span className={styles.checkText}>{task.title}</span>
                    </button>
                  );
                })
              )}
            </div>

            {routineTasks.length > 0 && (
              <div className={styles.progressContainer}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                  <span>{doneCount} de {routineTasks.length} feitas</span>
                  <span>{progress}%{progress === 100 ? ' 🎉' : ''}</span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Metas de Foco */}
        <section className={styles.goalsSection}>
          <div className={styles.sectionHeader}>
            <h2 className="h3">Foco Principal</h2>
            <Link href="/metas" className={styles.sectionLink}>Ver metas →</Link>
          </div>

          <div className={styles.goalsList}>
            {goals.length === 0 ? (
              <p className="text-muted">
                Nenhuma meta em andamento. <Link href="/metas" className={styles.sectionLink}>Criar meta</Link>
              </p>
            ) : (
              goals.map(goal => (
                <div key={goal.id} className={`${styles.goalCard} glass-panel ${goal.completed ? styles.goalCompleted : ''}`}>
                  <div className={styles.goalHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={!!goal.completed}
                        aria-label={`Concluir meta ${goal.title}`}
                        className={`${styles.checkbox} ${goal.completed ? styles.checkboxActive : ''}`}
                        onClick={() => toggleGoal(goal)}
                      >
                        {goal.completed && <CheckMark />}
                      </button>
                      <h3 className={styles.goalTitle}>{goal.title}</h3>
                    </div>
                    <span className="badge badge-amber">Foco {goal.focus_level}</span>
                  </div>
                  {goal.description && <p className={styles.goalDesc}>{goal.description}</p>}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Modal de Palavra */}
      <Modal
        isOpen={isWordModalOpen}
        onClose={() => setIsWordModalOpen(false)}
        title={editingWordId ? 'Editar Palavra' : 'Nova Palavra da Semana'}
      >
        <form onSubmit={handleSaveWord} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Palavra / Frase *</label>
            <textarea
              value={editWord}
              onChange={e => setEditWord(e.target.value)}
              placeholder="Ex: Tudo posso naquele que me fortalece."
              required
              rows={3}
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Referência / Descrição</label>
            <input
              type="text"
              value={editWordDesc}
              onChange={e => setEditWordDesc(e.target.value)}
              placeholder="Ex: Filipenses 4:13"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }} disabled={savingWord}>
            {savingWord ? 'Salvando...' : editingWordId ? 'Atualizar Palavra' : 'Adicionar Palavra'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
