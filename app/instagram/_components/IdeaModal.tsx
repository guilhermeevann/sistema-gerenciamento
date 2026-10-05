"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/Modal';
import { showToast } from '@/components/Toast';
import { todayLocal } from '@/lib/date';
import styles from '../instagram.module.css';
import {
  IdeaStatus, IgIdea, IgInspiration, IgModel, formats, numOrNull, orNull, performanceOptions,
} from '../types';

interface Props {
  isOpen: boolean;
  idea: IgIdea | null;
  // Status com que o modal abre (ex.: "publicado" ao marcar uma ideia como postada).
  status: IdeaStatus;
  models: IgModel[];
  inspirations: IgInspiration[];
  onClose: () => void;
  onSaved: () => void;
}

const statusOptions: { value: IdeaStatus; label: string }[] = [
  { value: 'brainstorm', label: '🌪️ Tempestade' },
  { value: 'pronta', label: '✅ Pronta' },
  { value: 'producao', label: '🎬 Em produção' },
  { value: 'publicado', label: '📤 Publicado' },
];

const metricFields = [
  { key: 'views', label: 'Views' },
  { key: 'likes', label: 'Curtidas' },
  { key: 'comments', label: 'Comentários' },
  { key: 'saves', label: 'Salvos' },
  { key: 'shares', label: 'Compart.' },
  { key: 'follows', label: 'Seguidores' },
] as const;

type MetricKey = typeof metricFields[number]['key'];

const toForm = (idea: IgIdea | null, status: IdeaStatus) => ({
  title: idea?.title ?? '',
  hook: idea?.hook ?? '',
  description: idea?.description ?? '',
  status,
  format: idea?.format ?? '',
  pillar: idea?.pillar ?? '',
  model_id: idea?.model_id ?? '',
  inspiration_id: idea?.inspiration_id ?? '',
  published_at: idea?.published_at ?? (status === 'publicado' ? todayLocal() : ''),
  post_url: idea?.post_url ?? '',
  performance: idea?.performance ?? '',
  learnings: idea?.learnings ?? '',
  ...Object.fromEntries(metricFields.map(m => [m.key, idea?.[m.key]?.toString() ?? ''])) as Record<MetricKey, string>,
});

export default function IdeaModal({ isOpen, idea, status, models, inspirations, onClose, onSaved }: Props) {
  const [form, setForm] = useState(() => toForm(idea, status));
  const [saving, setSaving] = useState(false);

  const set = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const published = form.status === 'publicado';
    const data = {
      title: form.title.trim(),
      hook: orNull(form.hook),
      description: orNull(form.description),
      status: form.status,
      format: form.format || null,
      pillar: orNull(form.pillar),
      model_id: form.model_id || null,
      inspiration_id: form.inspiration_id || null,
      published_at: published ? form.published_at || null : null,
      post_url: published ? orNull(form.post_url) : null,
      performance: published ? form.performance || null : null,
      learnings: published ? orNull(form.learnings) : null,
      ...Object.fromEntries(metricFields.map(m => [m.key, published ? numOrNull(form[m.key]) : null])),
    };
    const { error } = idea
      ? await supabase.from('ig_ideas').update(data).eq('id', idea.id)
      : await supabase.from('ig_ideas').insert([data]);
    setSaving(false);
    if (error) { showToast('Erro ao salvar ideia.', 'error'); return; }
    showToast(published && idea?.status !== 'publicado' ? 'Post registrado! 🚀' : 'Ideia salva!');
    onSaved();
    onClose();
  };

  const published = form.status === 'publicado';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={idea ? 'Editar ideia' : 'Nova ideia'}>
      <form onSubmit={handleSave} className={styles.form}>
        <div className={styles.formGroup}>
          <label>Ideia *</label>
          <input value={form.title} onChange={e => set('title', e.target.value)} required autoFocus />
        </div>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Formato</label>
            <select value={form.format} onChange={e => set('format', e.target.value)}>
              <option value="">—</option>
              {formats.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
        </div>
        <div className={styles.formGroup}>
          <label>Gancho</label>
          <input value={form.hook} onChange={e => set('hook', e.target.value)} placeholder="A primeira frase / os 3 primeiros segundos" />
        </div>
        <div className={styles.formGroup}>
          <label>Roteiro / desenvolvimento</label>
          <textarea rows={8} value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Modelo</label>
            <select value={form.model_id} onChange={e => set('model_id', e.target.value)}>
              <option value="">Nenhum</option>
              {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Pilar / tema</label>
            <input value={form.pillar} onChange={e => set('pillar', e.target.value)} placeholder="Ex: Autoridade" />
          </div>
        </div>
        <div className={styles.formGroup}>
          <label>Inspiração</label>
          <select value={form.inspiration_id} onChange={e => set('inspiration_id', e.target.value)}>
            <option value="">Nenhuma</option>
            {inspirations.map(i => <option key={i.id} value={i.id}>{i.title}</option>)}
          </select>
        </div>

        {published && (
          <>
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Publicado em</label>
                <input type="date" value={form.published_at} onChange={e => set('published_at', e.target.value)} />
              </div>
              <div className={styles.formGroup}>
                <label>Performance</label>
                <select value={form.performance} onChange={e => set('performance', e.target.value)}>
                  <option value="">Ainda avaliando</option>
                  {performanceOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Link do post</label>
              <input type="url" value={form.post_url} onChange={e => set('post_url', e.target.value)} placeholder="https://instagram.com/p/..." />
            </div>
            <div className={styles.formRow3}>
              {metricFields.map(m => (
                <div key={m.key} className={styles.formGroup}>
                  <label>{m.label}</label>
                  <input type="number" min="0" value={form[m.key]} onChange={e => set(m.key, e.target.value)} />
                </div>
              ))}
            </div>
            <div className={styles.formGroup}>
              <label>Aprendizados</label>
              <textarea rows={2} value={form.learnings} onChange={e => set('learnings', e.target.value)} placeholder="O que funcionou, o que repetir" />
            </div>
          </>
        )}

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar'}
        </button>
      </form>
    </Modal>
  );
}
