"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './tarefas.module.css';
import Modal from '@/components/Modal';
import { showToast } from '@/components/Toast';

const daysOfWeek = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function Tarefas() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [title, setTitle] = useState('');
  const [type, setType] = useState('recurring');
  const [dayOfWeek, setDayOfWeek] = useState<number | ''>('');
  const [isEditing, setIsEditing] = useState<string | null>(null);

  const todayIndex = new Date().getDay();

  useEffect(() => { fetchTasks(); }, []);

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: true });
    if (error) showToast('Erro ao carregar tarefas.', 'error');
    else if (data) setTasks(data);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    const taskData = {
      title: title.trim(),
      type,
      day_of_week: type === 'extra' && dayOfWeek !== '' ? Number(dayOfWeek) : null
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

  const handleEdit = (task: any) => {
    setTitle(task.title);
    setType(task.type);
    setDayOfWeek(task.day_of_week !== null ? task.day_of_week : '');
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
    setDayOfWeek('');
    setIsEditing(null);
    setIsModalOpen(false);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className="h2">Rotina & Tarefas</h1>
          <p className="text-secondary">O dia de hoje está destacado no quadro semanal.</p>
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
              const dayTasks = tasks.filter(t => t.type === 'recurring' || (t.type === 'extra' && t.day_of_week === index));

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
                      dayTasks.map(task => (
                        <div key={task.id} className={`${styles.taskCard} ${task.type === 'recurring' ? styles.routine : styles.extra}`}>
                          <span className={styles.taskTitle}>{task.title}</span>
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
                      ))
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
            <label>Tipo de Tarefa</label>
            <select value={type} onChange={e => {
              setType(e.target.value);
              if (e.target.value === 'recurring') setDayOfWeek('');
            }}>
              <option value="recurring">🔄 Rotina Diária (aparece todo dia)</option>
              <option value="extra">📅 Extra — dia específico</option>
            </select>
          </div>

          {type === 'extra' && (
            <div className={styles.formGroup}>
              <label>Dia da Semana</label>
              <select 
                value={dayOfWeek} 
                onChange={e => setDayOfWeek(e.target.value !== '' ? Number(e.target.value) : '')}
                required={type === 'extra'}
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
