"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/Modal';
import { showToast } from '@/components/Toast';
import { confirmAction } from '@/components/ConfirmDialog';
import styles from '../instagram.module.css';
import { IgInspiration, IgModel, formats, formatLabel, orNull } from '../types';
import { EditIcon, LinkIcon, TrashIcon } from './icons';

interface Props {
  inspirations: IgInspiration[];
  models: IgModel[];
  onChange: () => void;
}

const empty = { title: '', url: '', profile: '', format: 'reels', notes: '', model_id: '' };

export default function InspiracoesTab({ inspirations, models, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');

  const open = (item?: IgInspiration) => {
    setEditing(item?.id ?? null);
    setForm(item ? {
      title: item.title,
      url: item.url ?? '',
      profile: item.profile ?? '',
      format: item.format,
      notes: item.notes ?? '',
      model_id: item.model_id ?? '',
    } : empty);
    setIsOpen(true);
  };

  const close = () => { setIsOpen(false); setEditing(null); setForm(empty); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    const data = {
      title: form.title.trim(),
      url: orNull(form.url),
      profile: orNull(form.profile.replace(/^@/, '')),
      format: form.format,
      notes: orNull(form.notes),
      model_id: form.model_id || null,
    };
    const { error } = editing
      ? await supabase.from('ig_inspirations').update(data).eq('id', editing)
      : await supabase.from('ig_inspirations').insert([data]);
    setSaving(false);
    if (error) { showToast('Erro ao salvar inspiração.', 'error'); return; }
    showToast(editing ? 'Inspiração atualizada!' : 'Inspiração salva!');
    close();
    onChange();
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAction({ title: 'Deletar inspiração?', message: 'Ideias criadas a partir dela continuam, só perdem o vínculo.', confirmLabel: 'Deletar', danger: true }))) return;
    const { error } = await supabase.from('ig_inspirations').delete().eq('id', id);
    if (error) showToast('Erro ao deletar.', 'error');
    else showToast('Inspiração removida.', 'info');
    onChange();
  };

  const toIdea = async (item: IgInspiration) => {
    const { error } = await supabase.from('ig_ideas').insert([{
      title: item.title,
      status: 'brainstorm',
      format: item.format,
      model_id: item.model_id,
      inspiration_id: item.id,
    }]);
    if (error) showToast('Erro ao criar ideia.', 'error');
    else showToast('Virou ideia na Tempestade!');
    onChange();
  };

  const visible = filter ? inspirations.filter(i => i.format === filter) : inspirations;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Inspirações</h2>
          <p className={styles.sectionHint}>Posts de outros perfis que valem estudar ou adaptar.</p>
        </div>
        <div className={styles.filters}>
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">Todos os formatos</option>
            {formats.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => open()}>+ Nova inspiração</button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className={styles.empty}>Nenhuma inspiração salva{filter ? ' neste formato' : ''}.</div>
      ) : (
        <div className={styles.grid}>
          {visible.map(item => {
            const model = models.find(m => m.id === item.model_id);
            return (
              <div key={item.id} className={`${styles.card} glass-panel`}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>{item.title}</span>
                  <div className={styles.actions}>
                    <button className={styles.iconBtn} onClick={() => open(item)} title="Editar"><EditIcon /></button>
                    <button className={`${styles.iconBtn} ${styles.deleteIconBtn}`} onClick={() => handleDelete(item.id)} title="Deletar"><TrashIcon /></button>
                  </div>
                </div>
                <div className={styles.badges}>
                  <span className="badge badge-purple">{formatLabel(item.format)}</span>
                  {item.profile && <span className="badge badge-blue">@{item.profile}</span>}
                  {model && <span className="badge badge-green">{model.name}</span>}
                </div>
                {item.notes && <p className={styles.cardText}>{item.notes}</p>}
                {item.url && (
                  <a href={item.url} target="_blank" rel="noreferrer" className={styles.link}><LinkIcon /> Ver post</a>
                )}
                <div className={styles.cardFooter}>
                  <button className={`btn btn-secondary ${styles.smallBtn}`} onClick={() => toIdea(item)}>💡 Virar ideia</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isOpen} onClose={close} title={editing ? 'Editar inspiração' : 'Nova inspiração'}>
        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Título *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Reel comparando 3 IAs" required autoFocus />
          </div>
          <div className={styles.formGroup}>
            <label>Link do post</label>
            <input type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://instagram.com/p/..." />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Perfil</label>
              <input value={form.profile} onChange={e => setForm({ ...form, profile: e.target.value })} placeholder="@perfil" />
            </div>
            <div className={styles.formGroup}>
              <label>Formato</label>
              <select value={form.format} onChange={e => setForm({ ...form, format: e.target.value })}>
                {formats.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>Modelo relacionado</label>
            <select value={form.model_id} onChange={e => setForm({ ...form, model_id: e.target.value })}>
              <option value="">Nenhum</option>
              {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Por que chamou atenção</label>
            <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Gancho, edição, tema, números..." />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : editing ? 'Atualizar' : 'Salvar inspiração'}
          </button>
        </form>
      </Modal>
    </section>
  );
}
