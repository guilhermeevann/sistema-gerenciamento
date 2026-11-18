"use client";

import { useState } from 'react';
import Modal from '@/components/Modal';
import { criar, atualizar, apagar as apagarPeca } from '../api';
import { showToast } from '@/components/Toast';
import styles from '../conteudo.module.css';
import {
  Etapa, Formato, Gravacao, Peca, Plataforma, etapas, formatos, gravacoes, hojeISO,
  numOrNull, orNull, plataformaInfo, plataformas, precisaGravar, prioridades,
} from '../types';

// Valores iniciais de uma peça nova (ex.: um corte já nasce ligado à mãe).
export type Rascunho = Partial<Peca>;

interface Props {
  isOpen: boolean;
  peca: Peca | null;
  rascunho: Rascunho;
  pecas: Peca[];
  onClose: () => void;
  onSaved: () => void;
  onNovoCorte: (mae: Peca) => void;
  onAbrir: (p: Peca) => void;
}

export default function PecaModal({ isOpen, peca, rascunho, pecas, onClose, onSaved, onNovoCorte, onAbrir }: Props) {
  const base = { ...rascunho, ...peca };
  const [form, setForm] = useState({
    titulo: base.titulo ?? '',
    plataforma: (base.plataforma ?? '') as Plataforma | '',
    formato: (base.formato ?? '') as Formato | '',
    etapa: (base.etapa ?? 'ideia') as Etapa,
    mae_id: base.mae_id ?? '',
    gancho: base.gancho ?? '',
    roteiro: base.roteiro ?? '',
    cta: base.cta ?? '',
    referencia: base.referencia ?? '',
    gravacao: (base.gravacao ?? '') as Gravacao | '',
    prioridade: String(base.prioridade ?? 2),
    data: base.data ?? '',
    link: base.link ?? '',
    numero1: base.numero1 != null ? String(base.numero1) : '',
    numero2: base.numero2 != null ? String(base.numero2) : '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const cortes = peca ? pecas.filter(p => p.mae_id === peca.id) : [];
  // Mãe possível: vídeo sem mãe, que não seja esta nem um dos cortes dela (a mãe atual sempre aparece).
  const maesPossiveis = pecas
    .filter(p => p.id === base.mae_id || (!p.mae_id && p.id !== peca?.id && !cortes.some(c => c.id === p.id)
      && (p.formato === 'video_longo' || p.formato === 'video_curto')))
    .sort((a, b) => (a.formato === 'video_longo' ? 0 : 1) - (b.formato === 'video_longo' ? 0 : 1) || a.titulo.localeCompare(b.titulo));
  const mae = pecas.find(p => p.id === form.mae_id) ?? null;
  const info = plataformaInfo(form.plataforma || null);
  const ehVideo = precisaGravar((form.formato || null) as Formato | null);
  const publicado = form.etapa === 'publicado';

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titulo.trim()) { showToast('Dê um título à peça.', 'error'); return; }
    setSaving(true);
    const payload = {
      titulo: form.titulo.trim(),
      plataforma: form.plataforma || null,
      formato: form.formato || null,
      etapa: form.etapa,
      mae_id: form.mae_id || null,
      gancho: orNull(form.gancho),
      roteiro: orNull(form.roteiro),
      cta: orNull(form.cta),
      referencia: orNull(form.referencia),
      gravacao: ehVideo ? (form.gravacao || null) : null,
      prioridade: Number(form.prioridade) as Peca['prioridade'],
      data: form.data || (publicado ? hojeISO() : null),
      link: orNull(form.link),
      numero1: numOrNull(form.numero1),
      numero2: numOrNull(form.numero2),
    };
    const { error } = peca
      ? await atualizar(peca.id, payload)
      : await criar(payload);
    setSaving(false);
    if (error) { showToast('Não salvou: ' + error.message, 'error'); return; }
    showToast(peca ? 'Peça atualizada.' : 'Peça criada.');
    onSaved();
    onClose();
  };

  const apagar = async () => {
    if (!peca) return;
    const aviso = cortes.length ? `\n\nOs ${cortes.length} cortes dela continuam, sem mãe.` : '';
    if (!window.confirm(`Apagar "${peca.titulo}"?${aviso}`)) return;
    const { error } = await apagarPeca(peca.id);
    if (error) { showToast('Não apagou: ' + error.message, 'error'); return; }
    showToast('Peça apagada.');
    onSaved();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={peca ? 'Peça' : form.mae_id ? 'Novo corte' : 'Nova peça'}>
      <form className={styles.form} onSubmit={salvar}>
        <div className={styles.formGroup}>
          <label htmlFor="f-titulo">Título</label>
          <input id="f-titulo" value={form.titulo} onChange={e => set('titulo', e.target.value)} autoFocus={!peca} />
        </div>

        <div className={styles.formRow3}>
          <div className={styles.formGroup}>
            <label htmlFor="f-plat">Plataforma</label>
            <select id="f-plat" value={form.plataforma} onChange={e => set('plataforma', e.target.value)}>
              <option value="">A definir</option>
              {plataformas.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="f-formato">Formato</label>
            <select id="f-formato" value={form.formato} onChange={e => set('formato', e.target.value)}>
              <option value="">A definir</option>
              {formatos.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="f-etapa">Etapa</label>
            <select id="f-etapa" value={form.etapa} onChange={e => set('etapa', e.target.value)}>
              {etapas.map(et => <option key={et.value} value={et.value}>{et.label}</option>)}
            </select>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="f-mae">É corte de</label>
          <select id="f-mae" value={form.mae_id} onChange={e => set('mae_id', e.target.value)}>
            <option value="">Nenhuma (peça independente)</option>
            {maesPossiveis.map(p => <option key={p.id} value={p.id}>{p.titulo}</option>)}
          </select>
          {mae && <button type="button" className={styles.linkBtn} onClick={() => onAbrir(mae)}>Abrir a peça-mãe</button>}
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="f-gancho">Gancho</label>
          <input id="f-gancho" value={form.gancho} onChange={e => set('gancho', e.target.value)} placeholder="A primeira frase" />
        </div>
        <div className={styles.formGroup}>
          <label htmlFor="f-roteiro">Roteiro ou texto da peça</label>
          <textarea id="f-roteiro" rows={6} value={form.roteiro} onChange={e => set('roteiro', e.target.value)} />
        </div>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label htmlFor="f-cta">CTA</label>
            <input id="f-cta" value={form.cta} onChange={e => set('cta', e.target.value)} placeholder="O que a pessoa faz no fim" />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="f-ref">Referência (link)</label>
            <input id="f-ref" type="url" value={form.referencia} onChange={e => set('referencia', e.target.value)} placeholder="https://..." />
          </div>
        </div>

        <div className={styles.formRow3}>
          {ehVideo && (
            <div className={styles.formGroup}>
              <label htmlFor="f-grav">Como gravar</label>
              <select id="f-grav" value={form.gravacao} onChange={e => set('gravacao', e.target.value)}>
                <option value="">A definir</option>
                {gravacoes.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
          )}
          <div className={styles.formGroup}>
            <label htmlFor="f-prio">Prioridade</label>
            <select id="f-prio" value={form.prioridade} onChange={e => set('prioridade', e.target.value)}>
              {prioridades.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="f-data">{publicado ? 'Publicado em' : 'Vai ao ar em'}</label>
            <input id="f-data" type="date" value={form.data} onChange={e => set('data', e.target.value)} />
          </div>
        </div>

        {publicado && (
          <div className={styles.formRow3}>
            <div className={styles.formGroup}>
              <label htmlFor="f-link">Link do post</label>
              <input id="f-link" type="url" value={form.link} onChange={e => set('link', e.target.value)} placeholder="https://..." />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="f-n1">{info?.numeros[0] ?? 'Número 1'}</label>
              <input id="f-n1" type="number" min="0" value={form.numero1} onChange={e => set('numero1', e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="f-n2">{info?.numeros[1] ?? 'Número 2'}</label>
              <input id="f-n2" type="number" min="0" value={form.numero2} onChange={e => set('numero2', e.target.value)} />
            </div>
          </div>
        )}

        {peca && !peca.mae_id && (
          <div className={styles.cortesBox}>
            <div className={styles.cortesHead}>
              <strong>Cortes desta peça</strong>
              <button type="button" className="btn btn-secondary" onClick={() => onNovoCorte(peca)}>+ Novo corte</button>
            </div>
            {cortes.length === 0 && <p className="text-muted">Nenhum corte ainda.</p>}
            {cortes.map(c => (
              <button type="button" key={c.id} className={styles.corteLinha} onClick={() => onAbrir(c)}>
                <span className={styles.dot} style={{ background: plataformaInfo(c.plataforma)?.cor ?? 'var(--text-muted)' }} />
                <span className={styles.corteTitulo}>{c.titulo}</span>
                <span className={styles.meta}>{etapas.find(e => e.value === c.etapa)!.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className={styles.formActions}>
          {peca && <button type="button" className="btn btn-danger" onClick={apagar}>Apagar</button>}
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </form>
    </Modal>
  );
}
