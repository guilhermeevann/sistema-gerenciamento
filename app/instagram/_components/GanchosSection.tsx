"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/Modal';
import { showToast } from '@/components/Toast';
import { confirmAction } from '@/components/ConfirmDialog';
import styles from '../instagram.module.css';
import { IgHook, hookCategories, orNull } from '../types';
import { EditIcon, LinkIcon, TrashIcon } from './icons';

interface Props {
  // Avisa a página para recarregar as ideias depois de "Virar ideia".
  onIdeaCreated: () => void;
}

const empty = { text: '', category: '', profile: '', url: '', notes: '' };

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function GanchosSection({ onIdeaCreated }: Props) {
  const [hooks, setHooks] = useState<IgHook[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingTable, setMissingTable] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  // A tabela tem carregamento próprio: se o SQL ainda não rodou, só esta seção avisa.
  const fetchHooks = async () => {
    const { data, error } = await supabase.from('ig_hooks').select('*').order('created_at', { ascending: false });
    if (error && (error.code === 'PGRST205' || error.code === '42P01')) setMissingTable(true);
    else if (error) showToast('Erro ao carregar ganchos.', 'error');
    else setHooks(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchHooks(); }, []);

  const open = (hook?: IgHook) => {
    setEditing(hook?.id ?? null);
    setForm(hook ? {
      text: hook.text,
      category: hook.category ?? '',
      profile: hook.profile ?? '',
      url: hook.url ?? '',
      notes: hook.notes ?? '',
    } : empty);
    setIsOpen(true);
  };

  const close = () => { setIsOpen(false); setEditing(null); setForm(empty); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.text.trim()) return;
    setSaving(true);
    const data = {
      text: form.text.trim(),
      category: form.category || null,
      profile: orNull(form.profile.replace(/^@/, '')),
      url: orNull(form.url),
      notes: orNull(form.notes),
    };
    const { error } = editing
      ? await supabase.from('ig_hooks').update(data).eq('id', editing)
      : await supabase.from('ig_hooks').insert([data]);
    setSaving(false);
    if (error) { showToast('Erro ao salvar gancho.', 'error'); return; }
    showToast(editing ? 'Gancho atualizado!' : 'Gancho guardado!');
    close();
    fetchHooks();
  };

  const handleDelete = async (hook: IgHook) => {
    if (!(await confirmAction({ title: 'Deletar gancho?', message: `"${hook.text}"`, confirmLabel: 'Deletar', danger: true }))) return;
    const { error } = await supabase.from('ig_hooks').delete().eq('id', hook.id);
    if (error) showToast('Erro ao deletar.', 'error');
    else showToast('Gancho removido.', 'info');
    fetchHooks();
  };

  const copy = async (hook: IgHook) => {
    try {
      await navigator.clipboard.writeText(hook.text);
      showToast('Gancho copiado!');
    } catch {
      showToast('Não foi possível copiar.', 'error');
    }
  };

  const toIdea = async (hook: IgHook) => {
    const { error } = await supabase.from('ig_ideas').insert([{
      title: hook.text.length > 90 ? `${hook.text.slice(0, 87)}...` : hook.text,
      hook: hook.text,
      status: 'brainstorm',
    }]);
    if (error) { showToast('Erro ao criar ideia.', 'error'); return; }
    showToast('Virou ideia na Tempestade!');
    onIdeaCreated();
  };

  const visible = hooks.filter(h =>
    (!category || h.category === category) &&
    (!query.trim() || fold([h.text, h.notes, h.profile].filter(Boolean).join(' ')).includes(fold(query.trim())))
  );

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>🪝 Banco de ganchos</h2>
          <p className={styles.sectionHint}>Aberturas que te prenderam. Guarde o texto, de onde veio e por que funcionou.</p>
        </div>
        {!missingTable && <button className="btn btn-primary" onClick={() => open()}>+ Novo gancho</button>}
      </div>

      {loading ? null : missingTable ? (
        <div className={`${styles.setupBox} glass-panel`}>
          <h3 className={styles.panelTitle}>⚙️ Falta criar a tabela de ganchos</h3>
          <p className={styles.sectionHint}>
            No SQL Editor do Supabase, cole o conteúdo de <code>supabase/ig_ganchos.sql</code> e clique em Run. Depois recarregue a página.
          </p>
        </div>
      ) : (
        <>
          {hooks.length > 0 && (
            <div className={styles.filters}>
              <input className={styles.search} type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder={`Buscar em ${hooks.length} ganchos...`} />
              <select value={category} onChange={e => setCategory(e.target.value)}>
                <option value="">Todos os tipos</option>
                {hookCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}

          {visible.length === 0 ? (
            <div className={styles.empty}>
              {hooks.length === 0 ? 'Nenhum gancho guardado. Viu uma abertura que te prendeu? Cadastre aqui.' : 'Nenhum gancho com esse filtro.'}
            </div>
          ) : (
            <div className={styles.grid}>
              {visible.map(hook => (
                <div key={hook.id} className={`${styles.card} glass-panel`}>
                  <div className={styles.cardHeader}>
                    <p className={styles.hookText}>“{hook.text}”</p>
                    <div className={styles.actions}>
                      <button className={styles.iconBtn} onClick={() => open(hook)} title="Editar"><EditIcon /></button>
                      <button className={`${styles.iconBtn} ${styles.deleteIconBtn}`} onClick={() => handleDelete(hook)} title="Deletar"><TrashIcon /></button>
                    </div>
                  </div>
                  {(hook.category || hook.profile) && (
                    <div className={styles.badges}>
                      {hook.category && <span className="badge badge-amber">{hook.category}</span>}
                      {hook.profile && <span className="badge badge-blue">@{hook.profile}</span>}
                    </div>
                  )}
                  {hook.notes && <p className={styles.cardText}>{hook.notes}</p>}
                  {hook.url && (
                    <a href={hook.url} target="_blank" rel="noreferrer" className={styles.link}><LinkIcon /> Ver original</a>
                  )}
                  <div className={styles.cardFooter}>
                    <button className={`btn btn-secondary ${styles.smallBtn}`} onClick={() => copy(hook)}>📋 Copiar</button>
                    <button className={`btn btn-secondary ${styles.smallBtn}`} onClick={() => toIdea(hook)}>💡 Virar ideia</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <Modal isOpen={isOpen} onClose={close} title={editing ? 'Editar gancho' : 'Novo gancho'}>
        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Gancho *</label>
            <textarea rows={3} value={form.text} onChange={e => setForm({ ...form, text: e.target.value })} placeholder="A primeira frase, do jeito que foi dita" required autoFocus />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Tipo</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="">—</option>
                {hookCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Perfil</label>
              <input value={form.profile} onChange={e => setForm({ ...form, profile: e.target.value })} placeholder="@perfil" />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>Link do post</label>
            <input type="url" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://instagram.com/reel/..." />
          </div>
          <div className={styles.formGroup}>
            <label>Por que te prendeu</label>
            <textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Quebrou expectativa, número específico, tom..." />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : editing ? 'Atualizar gancho' : 'Guardar gancho'}
          </button>
        </form>
      </Modal>
    </section>
  );
}
