"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { todayLocal } from '@/lib/date';
import Modal from '@/components/Modal';
import { showToast } from '@/components/Toast';
import { confirmAction } from '@/components/ConfirmDialog';
import styles from './marcos.module.css';
import { Milestone, MilestoneKind, countdown, dateLabel, kindOf, kinds, monthLabel, parseDate, rangeOf } from './types';
import VerticalTimeline from './_components/VerticalTimeline';
import HorizontalTimeline from './_components/HorizontalTimeline';

type View = 'vertical' | 'horizontal' | 'lista';
const VIEW_KEY = 'marcos-view';
const SPAN_KEY = 'marcos-span';

const views: { value: View; label: string }[] = [
  { value: 'vertical', label: '↕ Linha' },
  { value: 'horizontal', label: '↔ Horizontal' },
  { value: 'lista', label: '☰ Lista' },
];

const spans = [3, 6, 12];

const emptyForm = { title: '', date: '', approximate: false, kind: 'pessoal' as MilestoneKind, notes: '', done: false };

export default function Marcos() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingTable, setMissingTable] = useState(false);

  const [view, setView] = useState<View>('vertical');
  const [months, setMonths] = useState(3);
  const [offset, setOffset] = useState(0); // meses a partir do mês atual

  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchMilestones = async () => {
    const { data, error } = await supabase.from('milestones').select('*').order('date', { ascending: true });
    if (error && (error.code === 'PGRST205' || error.code === '42P01')) setMissingTable(true);
    else if (error) showToast('Erro ao carregar marcos.', 'error');
    else setMilestones(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchMilestones();
    try {
      const v = localStorage.getItem(VIEW_KEY) as View | null;
      if (v && views.some(x => x.value === v)) setView(v);
      const s = Number(localStorage.getItem(SPAN_KEY));
      if (spans.includes(s)) setMonths(s);
    } catch {}
  }, []);

  const remember = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch {} };

  const today = parseDate(todayLocal());
  const start = new Date(today.getFullYear(), today.getMonth() + offset, 1, 12);
  const { from, to } = rangeOf(start, months);
  const inRange = milestones.filter(m => {
    const d = parseDate(m.date);
    return d >= from && d < to;
  });
  const outside = milestones.length - inRange.length;
  const next = milestones.find(m => !m.done && parseDate(m.date) >= today);

  const open = (m?: Milestone) => {
    setEditing(m?.id ?? null);
    setForm(m ? { title: m.title, date: m.date, approximate: m.approximate, kind: m.kind, notes: m.notes ?? '', done: m.done } : { ...emptyForm, date: todayLocal() });
    setIsOpen(true);
  };

  const close = () => { setIsOpen(false); setEditing(null); setForm(emptyForm); };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date) return;
    setSaving(true);
    const data = {
      title: form.title.trim(),
      date: form.date,
      approximate: form.approximate,
      kind: form.kind,
      notes: form.notes.trim() || null,
      done: form.done,
    };
    const { error } = editing
      ? await supabase.from('milestones').update(data).eq('id', editing)
      : await supabase.from('milestones').insert([data]);
    setSaving(false);
    if (error) { showToast('Erro ao salvar marco.', 'error'); return; }
    showToast(editing ? 'Marco atualizado!' : 'Marco criado!');
    close();
    fetchMilestones();
  };

  const handleDelete = async () => {
    if (!editing) return;
    if (!(await confirmAction({ title: 'Deletar marco?', message: `"${form.title}" sai da linha do tempo.`, confirmLabel: 'Deletar', danger: true }))) return;
    const { error } = await supabase.from('milestones').delete().eq('id', editing);
    if (error) { showToast('Erro ao deletar.', 'error'); return; }
    showToast('Marco removido.', 'info');
    close();
    fetchMilestones();
  };

  const toggleDone = async (m: Milestone) => {
    setMilestones(prev => prev.map(x => x.id === m.id ? { ...x, done: !m.done } : x));
    const { error } = await supabase.from('milestones').update({ done: !m.done }).eq('id', m.id);
    if (error) {
      setMilestones(prev => prev.map(x => x.id === m.id ? m : x));
      showToast('Não foi possível salvar.', 'error');
    } else if (!m.done) showToast('Marco concluído! 🎉');
  };

  const rangeLabel = `${monthLabel(from)} ${from.getFullYear()} → ${monthLabel(to)} ${to.getFullYear()}`;

  const renderList = () => {
    const groups = rangeOf(start, months).monthStarts.slice(0, -1).map(d => ({
      month: d,
      items: inRange.filter(m => {
        const md = parseDate(m.date);
        return md.getMonth() === d.getMonth() && md.getFullYear() === d.getFullYear();
      }),
    }));
    return (
      <div className={styles.list}>
        {groups.map(g => (
          <section key={g.month.toISOString()} className={styles.listMonth}>
            <h3 className={styles.listMonthTitle}>
              <span className={styles.listDot} />
              {monthLabel(g.month)} <span className={styles.listYear}>{g.month.getFullYear()}</span>
            </h3>
            {g.items.length === 0 ? (
              <p className={styles.listEmpty}>Nenhum marco.</p>
            ) : g.items.map(m => {
              const kind = kindOf(m.kind);
              return (
                <div key={m.id} className={`${styles.listItem} glass-panel`} style={{ borderLeftColor: kind.color }}>
                  <button
                    role="checkbox"
                    aria-checked={m.done}
                    aria-label={`Concluir ${m.title}`}
                    className={`${styles.check} ${m.done ? styles.checkOn : ''}`}
                    onClick={() => toggleDone(m)}
                  >
                    {m.done && '✓'}
                  </button>
                  <button className={styles.listBody} onClick={() => open(m)}>
                    <span className={`${styles.mTitle} ${m.done ? styles.mDone : ''}`}>{m.title}</span>
                    <span className={styles.mMeta}>
                      <span style={{ color: kind.color }}>{dateLabel(m)}</span> · {kind.label} · {countdown(m, today)}
                    </span>
                    {m.notes && <span className={styles.listNotes}>{m.notes}</span>}
                  </button>
                </div>
              );
            })}
          </section>
        ))}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1 className="h2">Linha do Tempo</h1>
          <p className="text-secondary">Os marcos que importam nos próximos meses, num traço só.</p>
        </div>
        {!missingTable && <button className="btn btn-primary" onClick={() => open()}>+ Novo marco</button>}
      </header>

      {loading ? (
        <div className="page-loading">Carregando...</div>
      ) : missingTable ? (
        <div className={`${styles.setupBox} glass-panel`}>
          <strong>⚙️ Falta criar a tabela de marcos</strong>
          <p className="text-secondary">No SQL Editor do Supabase, cole o conteúdo de <code>supabase/marcos.sql</code> e clique em Run. Depois recarregue a página.</p>
        </div>
      ) : (
        <>
          {next && (
            <button className={`${styles.nextCard} glass-panel`} onClick={() => open(next)}>
              <span className={styles.nextLabel}>Próximo marco</span>
              <span className={styles.nextTitle}>{next.title}</span>
              <span className={styles.mMeta}>{dateLabel(next)} · {countdown(next, today)}</span>
            </button>
          )}

          <div className={styles.toolbar}>
            <div className={styles.segment} role="tablist" aria-label="Visualização">
              {views.map(v => (
                <button
                  key={v.value}
                  role="tab"
                  aria-selected={view === v.value}
                  className={`${styles.segBtn} ${view === v.value ? styles.segActive : ''}`}
                  onClick={() => { setView(v.value); remember(VIEW_KEY, v.value); }}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <div className={styles.rangeNav}>
              <button className={styles.navBtn} onClick={() => setOffset(o => o - months)} aria-label="Período anterior">‹</button>
              <button className={styles.rangeLabel} onClick={() => setOffset(0)} title="Voltar para o mês atual">{rangeLabel}</button>
              <button className={styles.navBtn} onClick={() => setOffset(o => o + months)} aria-label="Próximo período">›</button>
            </div>

            <div className={styles.segment} aria-label="Duração">
              {spans.map(s => (
                <button
                  key={s}
                  className={`${styles.segBtn} ${months === s ? styles.segActive : ''}`}
                  onClick={() => { setMonths(s); remember(SPAN_KEY, String(s)); }}
                >
                  {s} meses
                </button>
              ))}
            </div>
          </div>

          <div className={styles.legend}>
            {kinds.map(k => (
              <span key={k.value} className={styles.legendItem}>
                <span className={styles.legendDiamond} style={{ borderColor: k.color }} />{k.label}
              </span>
            ))}
            {outside > 0 && <span className={styles.outside}>{outside} marco(s) fora deste período</span>}
          </div>

          <div className={`${styles.board} glass-panel`}>
            {milestones.length === 0 && (
              <p className={styles.boardEmpty}>Nenhum marco ainda. Comece pelos grandes: uma entrega, uma mudança, uma viagem.</p>
            )}
            {view === 'vertical' && <VerticalTimeline milestones={inRange} start={start} months={months} today={today} onEdit={open} />}
            {view === 'horizontal' && <HorizontalTimeline milestones={inRange} start={start} months={months} today={today} onEdit={open} />}
            {view === 'lista' && renderList()}
          </div>
        </>
      )}

      <Modal isOpen={isOpen} onClose={close} title={editing ? 'Editar marco' : 'Novo marco'}>
        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.formGroup}>
            <label>Marco *</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Mudança para Sorocaba" required autoFocus />
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Data *</label>
              <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div className={styles.formGroup}>
              <label>Tipo</label>
              <select value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value as MilestoneKind })}>
                {kinds.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
          </div>
          <label className={styles.checkRow}>
            <input type="checkbox" checked={form.approximate} onChange={e => setForm({ ...form, approximate: e.target.checked })} />
            Data aproximada (mostra &ldquo;início / meados / fim do mês&rdquo;)
          </label>
          <div className={styles.formGroup}>
            <label>Anotações</label>
            <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="O que precisa estar pronto até lá" />
          </div>
          {editing && (
            <label className={styles.checkRow}>
              <input type="checkbox" checked={form.done} onChange={e => setForm({ ...form, done: e.target.checked })} />
              Marco concluído
            </label>
          )}
          <div className={styles.formActions}>
            {editing && <button type="button" className="btn btn-danger" onClick={handleDelete}>Deletar</button>}
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? 'Salvando...' : editing ? 'Atualizar marco' : 'Criar marco'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
