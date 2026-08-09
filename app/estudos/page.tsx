"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import styles from './estudos.module.css';
import Modal from '@/components/Modal';
import { showToast } from '@/components/Toast';

const areas = ['Espiritual', 'Profissional', 'Desenvolvimento Pessoal'];

export default function Estudos() {
  const [studies, setStudies] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [title, setTitle] = useState('');
  const [type, setType] = useState('theme');
  const [area, setArea] = useState('Espiritual');
  const [progress, setProgress] = useState<number>(0);
  const [isEditing, setIsEditing] = useState<string | null>(null);

  const [activeStudyId, setActiveStudyId] = useState<string | null>(null);
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionVideo, setSessionVideo] = useState('');
  const [sessionDesc, setSessionDesc] = useState('');
  const [savingSession, setSavingSession] = useState(false);

  const [expandedSessions, setExpandedSessions] = useState<string[]>([]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: studiesData, error: sErr }, { data: sessionsData, error: seErr }] = await Promise.all([
      supabase.from('studies').select('*').order('created_at', { ascending: false }),
      supabase.from('study_sessions').select('*').order('date', { ascending: false })
    ]);
    if (sErr || seErr) showToast('Erro ao carregar estudos.', 'error');
    if (studiesData) setStudies(studiesData);
    if (sessionsData) setSessions(sessionsData);
    setLoading(false);
  };

  const handleSaveStudy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);

    const studyData = { title: title.trim(), type, area, progress };

    if (isEditing) {
      const { error } = await supabase.from('studies').update(studyData).eq('id', isEditing);
      if (error) showToast('Erro ao atualizar.', 'error');
      else showToast('Estudo atualizado!');
    } else {
      const { error } = await supabase.from('studies').insert([studyData]);
      if (error) showToast('Erro ao criar estudo.', 'error');
      else showToast('Estudo adicionado!');
    }

    setSaving(false);
    resetForm();
    fetchData();
  };

  const handleSaveSession = async (e: React.FormEvent, studyId: string) => {
    e.preventDefault();
    if (!sessionDesc.trim() || !sessionDate) return;
    setSavingSession(true);

    const { error } = await supabase.from('study_sessions').insert([{
      study_id: studyId,
      date: sessionDate,
      video_link: sessionVideo.trim() || null,
      description: sessionDesc.trim()
    }]);

    if (error) showToast('Erro ao salvar sessão.', 'error');
    else showToast('Sessão registrada!');

    setSavingSession(false);
    setSessionDesc('');
    setSessionVideo('');
    setActiveStudyId(null);
    fetchData();
  };

  const handleDeleteSession = async (id: string) => {
    if (!confirm('Deletar esta sessão de estudo?')) return;
    const { error } = await supabase.from('study_sessions').delete().eq('id', id);
    if (error) showToast('Erro ao deletar.', 'error');
    else showToast('Sessão removida.', 'info');
    fetchData();
  };

  const handleEdit = (study: any) => {
    setTitle(study.title);
    setType(study.type);
    setArea(study.area);
    setProgress(study.progress || 0);
    setIsEditing(study.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deletar este estudo e TODAS as suas sessões?')) return;
    const { error } = await supabase.from('studies').delete().eq('id', id);
    if (error) showToast('Erro ao deletar.', 'error');
    else showToast('Estudo removido.', 'info');
    fetchData();
  };

  const resetForm = () => {
    setTitle('');
    setType('theme');
    setArea('Espiritual');
    setProgress(0);
    setIsEditing(null);
    setIsModalOpen(false);
  };

  const toggleSession = (id: string) => {
    setExpandedSessions(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const renderStudyList = (currentArea: string) => {
    const areaStudies = studies.filter(s => s.area === currentArea);

    if (areaStudies.length === 0) {
      return (
        <div className={styles.emptyArea}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.25 }}>
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          <span>Nenhum estudo nesta área ainda.</span>
        </div>
      );
    }

    return (
      <div className={styles.studyGrid}>
        {areaStudies.map(study => {
          const studySessions = sessions.filter(s => s.study_id === study.id);

          return (
            <div key={study.id} className={`${styles.studyCard} glass-panel`}>
              <div className={styles.studyHeader}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: 0 }}>
                  <span className={styles.studyTitle}>{study.title}</span>
                  <span className={`badge ${study.type === 'book' ? 'badge-purple' : 'badge-blue'}`} style={{ alignSelf: 'flex-start' }}>
                    {study.type === 'book' ? 'Livro' : 'Tema'}
                  </span>
                </div>
                <div className={styles.actions}>
                  <button className={styles.iconBtn} onClick={() => handleEdit(study)} title="Editar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button className={`${styles.iconBtn} ${styles.deleteIconBtn}`} onClick={() => handleDelete(study.id)} title="Deletar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div className={styles.progressContainer}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  <span>Progresso</span>
                  <span style={{ color: study.progress >= 100 ? 'var(--accent-success)' : 'var(--text-secondary)' }}>
                    {study.progress}%{study.progress >= 100 ? ' ✓' : ''}
                  </span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${study.progress}%` }}></div>
                </div>
              </div>

              <div className={styles.sessionsContainer}>
                <div className={styles.sessionsHeader}>
                  <h4 className={styles.sessionsTitle}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    Sessões ({studySessions.length})
                  </h4>
                </div>

                {studySessions.map(sess => {
                  const isExpanded = expandedSessions.includes(sess.id);
                  const isLong = sess.description && sess.description.length > 120;

                  return (
                    <div key={sess.id} className={styles.sessionItem}>
                      <div className={styles.sessionHeader}>
                        <span className={styles.sessionDate}>
                          {new Date(sess.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <button className={`${styles.iconBtn} ${styles.deleteIconBtn}`} onClick={() => handleDeleteSession(sess.id)} title="Deletar sessão">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                          </svg>
                        </button>
                      </div>

                      <p className={`${styles.sessionDesc} ${!isExpanded && isLong ? styles.collapsedText : ''}`}>
                        {sess.description}
                      </p>
                      {isLong && (
                        <button className={styles.expandBtn} onClick={() => toggleSession(sess.id)}>
                          {isExpanded ? '↑ Ver menos' : '↓ Ler mais'}
                        </button>
                      )}
                      {sess.video_link && (
                        <a href={sess.video_link} target="_blank" rel="noreferrer" className={styles.sessionLink}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                          </svg>
                          Acessar Material / Vídeo
                        </a>
                      )}
                    </div>
                  );
                })}

                {activeStudyId === study.id ? (
                  <form onSubmit={(e) => handleSaveSession(e, study.id)} className={styles.sessionForm}>
                    <div className={styles.sessionFormRow}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Data</label>
                        <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)} required />
                      </div>
                    </div>
                    <input
                      type="url"
                      placeholder="Link do vídeo ou material (opcional)"
                      value={sessionVideo}
                      onChange={e => setSessionVideo(e.target.value)}
                    />
                    <textarea
                      placeholder="Insights e anotações desta sessão..."
                      value={sessionDesc}
                      onChange={e => setSessionDesc(e.target.value)}
                      required
                      rows={3}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '8px', fontSize: '0.85rem' }} disabled={savingSession}>
                        {savingSession ? 'Salvando...' : 'Salvar Sessão'}
                      </button>
                      <button type="button" className="btn btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem' }} onClick={() => setActiveStudyId(null)}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    className={styles.addSessionBtn}
                    onClick={() => { setActiveStudyId(study.id); setSessionDesc(''); setSessionVideo(''); }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Adicionar Sessão
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className="h2">Estudos & Leituras</h1>
          <p className="text-secondary">Acompanhe seus temas de estudo, adicione aulas e anote seus insights.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          + Novo Estudo
        </button>
      </header>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loadingState}>
            <div className={styles.spinner}></div>
            <span className="text-secondary">Carregando...</span>
          </div>
        ) : (
          <div className={styles.areasContainer}>
            {areas.map(areaName => (
              <div key={areaName} className={styles.areaBlock}>
                <div className={styles.areaTitleRow}>
                  <h3 className={styles.areaTitle}>{areaName}</h3>
                  <span className={styles.areaCount}>{studies.filter(s => s.area === areaName).length} estudo(s)</span>
                </div>
                {renderStudyList(areaName)}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={resetForm} title={isEditing ? 'Editar Estudo' : 'Novo Estudo'}>
        <form onSubmit={handleSaveStudy} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Título *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Teologia Básica"
              required
              autoFocus
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className={styles.formGroup}>
              <label>Tipo</label>
              <select value={type} onChange={e => setType(e.target.value)}>
                <option value="theme">📖 Tema/Assunto</option>
                <option value="book">📚 Livro</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Área</label>
              <select value={area} onChange={e => setArea(e.target.value)}>
                {areas.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>Progresso — {progress}%</label>
            <input
              type="range"
              min="0" max="100"
              value={progress}
              onChange={e => setProgress(Number(e.target.value))}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '8px' }} disabled={saving}>
            {saving ? 'Salvando...' : isEditing ? 'Atualizar Estudo' : 'Adicionar Estudo'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
