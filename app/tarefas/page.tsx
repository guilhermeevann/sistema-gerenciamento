"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './tarefas.module.css';
import Modal from '@/components/Modal';
import { showToast } from '@/components/Toast';

const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const daysShort = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const PRIORITY_CONFIG = {
  1: { label: 'Alta',  color: '#ef4444', bg: 'rgba(239,68,68,0.12)',    icon: '▲' },
  2: { label: 'Média', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',   icon: '●' },
  3: { label: 'Baixa', color: '#64748b', bg: 'rgba(100,116,139,0.12)',  icon: '▼' },
} as const;

type PriorityLevel = 1 | 2 | 3;

export default function Tarefas() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState('');
  const [type, setType] = useState('recurring');
  const [priority, setPriority] = useState<PriorityLevel>(2);
  const [dayOfWeek, setDayOfWeek] = useState<number | ''>('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);

  const todayIndex = new Date().getDay();

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) showToast('Erro ao carregar tarefas.', 'error');
    else if (data) setTasks(data);
    setLoading(false);
  };

  const toggleDay = (idx: number) => {
    setSelectedDays(prev =>
      prev.includes(idx) ? prev.filter(d => d !== idx) : [...prev, idx]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (type === 'weekly' && selectedDays.length === 0) {
      showToast('Selecione pelo menos um dia da semana.', 'error');
      return;
    }
    setSaving(true);

    const taskData: any = {
      title: title.trim(),
      type,
      priority,
      day_of_week: type === 'extra' && dayOfWeek !== '' ? Number(dayOfWeek) : null,
      days_of_week: type === 'weekly' ? selectedDays.sort() : null,
    };

    if (isEditing) {
      const { error } = await supabase.from('tasks').update(taskData).eq('id', isEditing);
      if (error) showToast('Erro ao atualizar tarefa.', 'error');
      else showToast('Tarefa atualizada!');
    } else {
      const { error } = await supabase.from('tasks').insert([taskData]);
      if (error) showToast('Erro ao criar tarefa.', 'error');
      else showToast('Tarefa adicionada!');
    }

    setSaving(false);
    resetForm();
    fetchTasks();
  };

  const handleChangePriority = async (task: any, newPriority: PriorityLevel) => {
    // Optimistic update
    setTasks(prev =>
      [...prev.map(t => t.id === task.id ? { ...t, priority: newPriority } : t)]
        .sort((a, b) => a.priority - b.priority || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    );
    await supabase.from('tasks').update({ priority: newPriority }).eq('id', task.id);
    showToast(`Prioridade alterada para ${PRIORITY_CONFIG[newPriority].label}.`, 'info');
  };

  const handleEdit = (task: any) => {
    setTitle(task.title);
    setType(task.type);
    setPriority((task.priority ?? 2) as PriorityLevel);
    setDayOfWeek(task.day_of_week !== null ? task.day_of_week : '');
    setSelectedDays(task.days_of_week || []);
    setIsEditing(task.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deletar esta tarefa?')) return;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) showToast('Erro ao deletar.', 'error');
    else showToast('Tarefa removida.', 'info');
    fetchTasks();
  };

  const handleClearAll = async () => {
    if (!confirm('Deletar TODAS as tarefas? Esta ação não pode ser desfeita.')) return;
    const { error } = await supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) showToast('Erro ao limpar.', 'error');
    else showToast('Todas as tarefas foram removidas.', 'info');
    fetchTasks();
  };

  const resetForm = () => {
    setTitle('');
    setType('recurring');
    setPriority(2);
    setDayOfWeek('');
    setSelectedDays([]);
    setIsEditing(null);
    setIsModalOpen(false);
  };

  const getTasksForDay = (dayIndex: number) => {
    return tasks.filter(t => {
      if (t.type === 'recurring') return true;
      if (t.type === 'weekly') return Array.isArray(t.days_of_week) && t.days_of_week.includes(dayIndex);
      if (t.type === 'extra') return t.day_of_week === dayIndex;
      return false;
    });
    // Already sorted by priority from the DB query
  };

  const getTaskTypeBadge = (task: any) => {
    if (task.type === 'recurring') return { label: 'Diário', color: 'var(--accent-primary)' };
    if (task.type === 'weekly') return { label: 'Semanal', color: 'var(--accent-success)' };
    return { label: 'Avulso', color: 'var(--accent-purple)' };
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className="h2">Rotina & Tarefas</h1>
          <p className="text-secondary">O dia de hoje está destacado. Alta prioridade aparece primeiro.</p>
        </div>
        <div className={styles.headerActions}>
          {tasks.length > 0 && (
            <button className="btn btn-danger" onClick={handleClearAll} style={{ fontSize: '0.85rem' }}>
              Limpar Tudo
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            + Nova Tarefa
          </button>
        </div>
      </header>

      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendItem}><span style={{ background: 'var(--accent-primary)' }} className={styles.legendDot}></span>Rotina Diária</span>
        <span className={styles.legendItem}><span style={{ background: 'var(--accent-success)' }} className={styles.legendDot}></span>Fixo Semanal</span>
        <span className={styles.legendItem}><span style={{ background: 'var(--accent-purple)' }} className={styles.legendDot}></span>Avulso</span>
        <span className={styles.legendDivider}></span>
        {([1,2,3] as PriorityLevel[]).map(p => (
          <span key={p} className={styles.legendItem}>
            <span style={{ color: PRIORITY_CONFIG[p].color, fontSize: '0.75rem', fontWeight: 700 }}>
              {PRIORITY_CONFIG[p].icon}
            </span>
            {PRIORITY_CONFIG[p].label}
          </span>
        ))}
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <span className="text-secondary">Carregando...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className={`${styles.emptyState} glass-panel`}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <p>Nenhuma tarefa criada ainda.</p>
            <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
              Criar primeira tarefa
            </button>
          </div>
        ) : (
          <div className={styles.weekBoard}>
            {daysOfWeek.map((dayName, index) => {
              const isToday = index === todayIndex;
              const dayTasks = getTasksForDay(index);

              return (
                <div key={index} className={`${styles.dayColumn} ${isToday ? styles.today : ''}`}>
                  <div className={styles.dayHeader}>
                    {dayName}
                    {isToday && <span className={styles.todayBadge}>Hoje</span>}
                  </div>

                  <div className={styles.taskList}>
                    {dayTasks.length === 0 ? (
                      <div className={styles.emptyDay}>Livre</div>
                    ) : (
                      dayTasks.map(task => {
                        const typeBadge = getTaskTypeBadge(task);
                        const pLevel = (task.priority ?? 2) as PriorityLevel;
                        const pCfg = PRIORITY_CONFIG[pLevel];

                        return (
                          <div
                            key={task.id}
                            className={styles.taskCard}
                            style={{ borderLeftColor: typeBadge.color }}
                          >
                            {/* Priority indicator bar */}
                            <div className={styles.priorityBar} style={{ background: pCfg.bg }}>
                              <span className={styles.priorityLabel} style={{ color: pCfg.color }}>
                                {pCfg.icon} {pCfg.label}
                              </span>
                              <div className={styles.priorityBtns}>
                                {([1,2,3] as PriorityLevel[]).map(p => (
                                  <button
                                    key={p}
                                    className={`${styles.priorityBtn} ${pLevel === p ? styles.priorityBtnActive : ''}`}
                                    style={pLevel === p ? { background: pCfg.color, color: '#0b0f19' } : {}}
                                    onClick={() => handleChangePriority(task, p)}
                                    title={`Prioridade ${PRIORITY_CONFIG[p].label}`}
                                  >
                                    {PRIORITY_CONFIG[p].icon}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <span className={styles.taskTitle}>{task.title}</span>

                            <div className={styles.taskFooter}>
                              <span className={styles.taskTypeBadge} style={{ color: typeBadge.color }}>
                                {typeBadge.label}
                              </span>
                              <div className={styles.taskActions}>
                                <button className={styles.iconBtn} onClick={() => handleEdit(task)} title="Editar">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                  </svg>
                                </button>
                                <button className={`${styles.iconBtn} ${styles.deleteIcon}`} onClick={() => handleDelete(task.id)} title="Deletar">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={resetForm} title={isEditing ? 'Editar Tarefa' : 'Nova Tarefa'}>
        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Título *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Devocional matinal"
              required
              autoFocus
            />
          </div>

          <div className={styles.formGroup}>
            <label>Prioridade</label>
            <div className={styles.prioritySelector}>
              {([1,2,3] as PriorityLevel[]).map(p => (
                <button
                  key={p}
                  type="button"
                  className={`${styles.prioritySelectorBtn} ${priority === p ? styles.prioritySelectorActive : ''}`}
                  style={priority === p ? { borderColor: PRIORITY_CONFIG[p].color, background: PRIORITY_CONFIG[p].bg, color: PRIORITY_CONFIG[p].color } : {}}
                  onClick={() => setPriority(p)}
                >
                  <span>{PRIORITY_CONFIG[p].icon}</span>
                  {PRIORITY_CONFIG[p].label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Tipo de Compromisso</label>
            <select value={type} onChange={e => {
              setType(e.target.value);
              setDayOfWeek('');
              setSelectedDays([]);
            }}>
              <option value="recurring">🔄 Rotina Diária — aparece todo dia</option>
              <option value="weekly">📆 Fixo Semanal — dias específicos toda semana</option>
              <option value="extra">📅 Avulso — um único dia</option>
            </select>
          </div>

          {type === 'weekly' && (
            <div className={styles.formGroup}>
              <label>Dias da semana *</label>
              <div className={styles.dayPicker}>
                {daysShort.map((day, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`${styles.dayPickerBtn} ${selectedDays.includes(idx) ? styles.dayPickerActive : ''}`}
                    onClick={() => toggleDay(idx)}
                  >
                    {day}
                  </button>
                ))}
              </div>
              {selectedDays.length > 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--accent-success)', marginTop: '4px' }}>
                  ✓ {selectedDays.sort().map(d => daysOfWeek[d]).join(', ')}
                </p>
              )}
            </div>
          )}

          {type === 'extra' && (
            <div className={styles.formGroup}>
              <label>Dia da Semana *</label>
              <select
                value={dayOfWeek}
                onChange={e => setDayOfWeek(e.target.value !== '' ? Number(e.target.value) : '')}
                required
              >
                <option value="">Selecione um dia...</option>
                {daysOfWeek.map((day, idx) => (
                  <option key={idx} value={idx}>{day}</option>
                ))}
              </select>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={saving}>
            {saving ? 'Salvando...' : isEditing ? 'Atualizar Tarefa' : 'Adicionar Tarefa'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
