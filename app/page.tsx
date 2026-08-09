"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './page.module.css';
import Modal from '@/components/Modal';

export default function Home() {
  const [goals, setGoals] = useState<any[]>([]);
  const [weeklyWord, setWeeklyWord] = useState<any>(null);
  const [routineTasks, setRoutineTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Word Modal State
  const [isWordModalOpen, setIsWordModalOpen] = useState(false);
  const [editWord, setEditWord] = useState('');
  const [editWordDesc, setEditWordDesc] = useState('');

  // Helper to get today's date string YYYY-MM-DD
  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const openWordModal = () => {
    setEditWord(weeklyWord?.word || '');
    setEditWordDesc(weeklyWord?.description || '');
    setIsWordModalOpen(true);
  };

  const handleSaveWord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editWord) return;

    if (weeklyWord?.id) {
      await supabase.from('weekly_words').update({ word: editWord, description: editWordDesc }).eq('id', weeklyWord.id);
    } else {
      await supabase.from('weekly_words').insert([{ word: editWord, description: editWordDesc, week_start: getTodayString() }]);
    }
    
    setIsWordModalOpen(false);
    fetchDashboardData();
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    
    // Fetch Goals
    const { data: goalsData } = await supabase
      .from('goals')
      .select('*')
      .order('focus_level', { ascending: false })
      .limit(3);
      
    if (goalsData) setGoals(goalsData);

    // Fetch Weekly Word (most recent)
    const { data: wordData } = await supabase
      .from('weekly_words')
      .select('*')
      .order('week_start', { ascending: false })
      .limit(1);
      
    if (wordData && wordData.length > 0) setWeeklyWord(wordData[0]);

    // Fetch All Tasks to filter for today
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*');
      
    if (tasksData) {
      const todayIndex = new Date().getDay();
      const todaysTasks = tasksData.filter(t => t.type === 'recurring' || (t.type === 'extra' && t.day_of_week === todayIndex));
      setRoutineTasks(todaysTasks);
    }
    
    setLoading(false);
  };

  const toggleTaskCompletion = async (task: any) => {
    const todayStr = getTodayString();
    // If it was completed today, we uncomplete it. Otherwise, we complete it today.
    const isCompletedToday = task.date === todayStr && task.is_completed;
    
    const newStatus = !isCompletedToday;
    const newDate = newStatus ? todayStr : null;

    // Update UI Optimistically
    setRoutineTasks(prev => prev.map(t => 
      t.id === task.id ? { ...t, is_completed: newStatus, date: newDate } : t
    ));

    await supabase
      .from('tasks')
      .update({ is_completed: newStatus, date: newDate })
      .eq('id', task.id);
  };

  const calculateProgress = () => {
    if (routineTasks.length === 0) return 0;
    const todayStr = getTodayString();
    const completedCount = routineTasks.filter(t => t.is_completed && t.date === todayStr).length;
    return Math.round((completedCount / routineTasks.length) * 100);
  };

  if (loading) {
    return <div className="text-secondary">Carregando painel...</div>;
  }

  const progress = calculateProgress();
  const todayStr = getTodayString();

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className="h2">Olá, Guilherme.</h1>
        <p className="text-secondary">O que vamos construir hoje?</p>
      </header>

      {/* Palavra da Semana */}
      <section className={`${styles.weeklyWord} glass-panel`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className={styles.wordTitle}>Palavra da Semana</span>
          <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={openWordModal}>
            Editar
          </button>
        </div>
        <p className={styles.wordContent}>
          "{weeklyWord?.word || 'Aguardando palavra da semana...'}"
        </p>
        {weeklyWord?.description && (
          <p className="text-secondary">{weeklyWord.description}</p>
        )}
      </section>

      <div className={styles.grid}>
        {/* Checklist Diário */}
        <section className={styles.routineSection}>
          <div className={`${styles.routineCard} glass-panel`}>
            <h2 className="h3">Rotina Diária</h2>
            <p className="text-secondary" style={{ fontSize: '0.9rem', marginTop: '-8px' }}>
              O que fizemos hoje?
            </p>

            <div className={styles.checklist}>
              {routineTasks.length === 0 ? (
                <p className="text-muted" style={{ fontSize: '0.9rem' }}>Nenhuma tarefa recorrente.</p>
              ) : (
                routineTasks.map(task => {
                  const isCompletedToday = task.is_completed && task.date === todayStr;
                  return (
                    <div 
                      key={task.id} 
                      className={`${styles.checkItem} ${isCompletedToday ? styles.completed : ''}`}
                      onClick={() => toggleTaskCompletion(task)}
                    >
                      <div className={styles.checkbox}>
                        {isCompletedToday && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <span className={styles.checkText}>{task.title}</span>
                    </div>
                  )
                })
              )}
            </div>

            <div className={styles.progressContainer}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span>Progresso</span>
                <span>{progress}%</span>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          </div>
        </section>

        {/* Metas de Foco */}
        <section className={styles.goalsSection}>
          <div className={styles.sectionHeader}>
            <h2 className="h3">Foco Principal</h2>
          </div>
          
          <div className={styles.goalsList}>
            {goals.length === 0 ? (
              <p className="text-muted">Nenhuma meta definida. Adicione metas na aba Metas.</p>
            ) : (
              goals.map(goal => (
                <div key={goal.id} className={`${styles.goalCard} glass-panel ${goal.completed ? styles.goalCompleted : ''}`}>
                  <div className={styles.goalHeader}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div 
                        className={`${styles.checkbox} ${goal.completed ? styles.checkboxActive : ''}`} 
                        onClick={async () => {
                          const newStatus = !goal.completed;
                          setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, completed: newStatus } : g));
                          await supabase.from('goals').update({ completed: newStatus }).eq('id', goal.id);
                        }}
                      >
                        {goal.completed && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 3L4.5 8.5L2 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <h3 className={styles.goalTitle}>{goal.title}</h3>
                    </div>
                    <span className="badge badge-amber">Foco {goal.focus_level}</span>
                  </div>
                  <p className={styles.goalDesc}>{goal.description}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <Modal isOpen={isWordModalOpen} onClose={() => setIsWordModalOpen(false)} title="Palavra da Semana">
        <form onSubmit={handleSaveWord} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Palavra / Frase</label>
            <input 
              type="text" 
              value={editWord} 
              onChange={e => setEditWord(e.target.value)} 
              placeholder="Ex: Tudo posso naquele que me fortalece."
              required
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
          <button type="submit" className="btn btn-primary" style={{ marginTop: '8px' }}>
            Atualizar Palavra
          </button>
        </form>
      </Modal>
    </div>
  );
}
