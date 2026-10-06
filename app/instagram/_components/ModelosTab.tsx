"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/Modal';
import { showToast } from '@/components/Toast';
import { confirmAction } from '@/components/ConfirmDialog';
import styles from '../instagram.module.css';
import { IgIdea, IgModel, formats, formatLabel, orNull, performed } from '../types';
import { EditIcon, LinkIcon, TrashIcon } from './icons';
import GanchosSection from './GanchosSection';

interface Props {
  models: IgModel[];
  ideas: IgIdea[];
  onChange: () => void;
}

const empty = { name: '', format: 'reels', description: '', structure: '', example_url: '', is_main: false };

export default function ModelosTab({ models, ideas, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const open = (model?: IgModel) => {
    setEditing(model?.id ?? null);
    setForm(model ? {
      name: model.name,
      format: model.format,
      description: model.description ?? '',
      structure: model.structure ?? '',
      example_url: model.example_url ?? '',
      is_main: model.is_main,
    } : empty);
    setIsOpen(true);
  };

  const close = () => { setIsOpen(false); setEditing(null); setForm(empty); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const data = {
      name: form.name.trim(),
      format: form.format,
      description: orNull(form.description),
      structure: orNull(form.structure),
      example_url: orNull(form.example_url),
      is_main: form.is_main,
    };
    const { error } = editing
      ? await supabase.from('ig_models').update(data).eq('id', editing)
      : await supabase.from('ig_models').insert([data]);
    setSaving(false);
    if (error) { showToast('Erro ao salvar modelo.', 'error'); return; }
    showToast(editing ? 'Modelo atualizado!' : 'Modelo criado!');
    close();
    onChange();
  };

  const handleDelete = async (id: string) => {
    if (!(await confirmAction({ title: 'Deletar modelo?', message: 'As ideias ligadas a ele continuam, só perdem o vínculo.', confirmLabel: 'Deletar', danger: true }))) return;
    const { error } = await supabase.from('ig_models').delete().eq('id', id);
    if (error) showToast('Erro ao deletar.', 'error');
    else showToast('Modelo removido.', 'info');
    onChange();
  };

  const sorted = [...models].sort((a, b) => Number(b.is_main) - Number(a.is_main));

  return (
    <>
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Modelos de conteúdo</h2>
          <p className={styles.sectionHint}>Os formatos que você repete. Marque os principais.</p>
        </div>
        <button className="btn btn-primary" onClick={() => open()}>+ Novo modelo</button>
      </div>

      {sorted.length === 0 ? (
        <div className={styles.empty}>Nenhum modelo ainda. Cadastre o primeiro formato que funciona pra você.</div>
      ) : (
        <div className={styles.grid}>
          {sorted.map(model => {
            const modelIdeas = ideas.filter(i => i.model_id === model.id);
            const posts = modelIdeas.filter(i => i.status === 'publicado');
            const hits = posts.filter(performed);
            return (
              <div key={model.id} className={`${styles.card} ${model.is_main ? styles.cardMain : ''} glass-panel`}>
                <div className={styles.cardHeader}>
                  <span className={styles.cardTitle}>{model.name}</span>
                  <div className={styles.actions}>
                    <button className={styles.iconBtn} onClick={() => open(model)} title="Editar"><EditIcon /></button>
                    <button className={`${styles.iconBtn} ${styles.deleteIconBtn}`} onClick={() => handleDelete(model.id)} title="Deletar"><TrashIcon /></button>
                  </div>
                </div>
                <div className={styles.badges}>
                  {model.is_main && <span className="badge badge-green">Principal</span>}
                  <span className="badge badge-purple">{formatLabel(model.format)}</span>
                </div>
                {model.description && <p className={styles.cardText}>{model.description}</p>}
                {model.structure && <p className={styles.cardText} style={{ color: 'var(--text-primary)' }}>{model.structure}</p>}
                {model.example_url && (
                  <a href={model.example_url} target="_blank" rel="noreferrer" className={styles.link}><LinkIcon /> Exemplo</a>
                )}
                <p className={styles.rowMeta} style={{ marginTop: 'auto' }}>
                  {modelIdeas.length} ideia(s) · {posts.length} publicado(s) · {hits.length} performou
                </p>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isOpen} onClose={close} title={editing ? 'Editar modelo' : 'Novo modelo'}>
        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Nome *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Tier list de ferramentas" required autoFocus />
          </div>
          <div className={styles.formGroup}>
            <label>Formato</label>
            <select value={form.format} onChange={e => setForm({ ...form, format: e.target.value })}>
              {formats.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Descrição</label>
            <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Quando usar, por que funciona" />
          </div>
          <div className={styles.formGroup}>
            <label>Estrutura / roteiro-base</label>
            <textarea rows={4} value={form.structure} onChange={e => setForm({ ...form, structure: e.target.value })} placeholder={'1. Gancho\n2. Desenvolvimento\n3. CTA'} />
          </div>
          <div className={styles.formGroup}>
            <label>Link de exemplo</label>
            <input type="url" value={form.example_url} onChange={e => setForm({ ...form, example_url: e.target.value })} placeholder="https://instagram.com/reel/..." />
          </div>
          <label className={styles.checkboxRow}>
            <input type="checkbox" checked={form.is_main} onChange={e => setForm({ ...form, is_main: e.target.checked })} />
            Modelo principal
          </label>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : editing ? 'Atualizar modelo' : 'Criar modelo'}
          </button>
        </form>
      </Modal>
    </section>

    <GanchosSection onIdeaCreated={onChange} />
    </>
  );
}
