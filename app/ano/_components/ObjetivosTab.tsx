"use client";

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/Modal';
import { showToast } from '@/components/Toast';
import { confirmAction } from '@/components/ConfirmDialog';
import styles from '../ano.module.css';
import {
  Area, GoalStatus, MAX_FOCUS, MeasureKind, YearGoal, YearMeasure,
  areaOf, areas, fmtNumber, goalProgress, isTopLevel, measureProgress, numOrNull, statusLabels, textOrNull,
} from '../types';

interface Props {
  year: number;
  goals: YearGoal[];
  measures: YearMeasure[];
  onChange: () => void;
}

const emptyGoal = { title: '', area: 'negocio' as Area, why: '', quarter: '', obstacle: '', if_then: '', status: 'ativo' as GoalStatus };
const emptyMeasure = { title: '', unit: '', start_value: '', target_value: '', current_value: '', frequency: '', quarter: '' };

const statusOrder: Record<GoalStatus, number> = { ativo: 0, concluido: 1, pausado: 2 };

export default function ObjetivosTab({ year, goals, measures, onChange }: Props) {
  const [goalModal, setGoalModal] = useState<{ open: boolean; editing: YearGoal | null }>({ open: false, editing: null });
  const [goalForm, setGoalForm] = useState(emptyGoal);
  const [measureModal, setMeasureModal] = useState<{ open: boolean; goalId: string; kind: MeasureKind; editing: YearMeasure | null }>({
    open: false, goalId: '', kind: 'resultado', editing: null,
  });
  const [measureForm, setMeasureForm] = useState(emptyMeasure);
  const [saving, setSaving] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // Detalhes (porquê, números, alavancas, obstáculo) ficam recolhidos para o card ficar limpo.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [subDrafts, setSubDrafts] = useState<Record<string, string>>({});
  const [showMore, setShowMore] = useState(false);

  // Metas são os objetivos sem mãe; submetas aparecem dentro do card da meta.
  const topLevel = goals.filter(isTopLevel);
  const active = topLevel.filter(g => g.status === 'ativo');
  const sorted = [...topLevel].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  const subsOf = (id: string) =>
    goals
      .filter(g => g.parent_id === id)
      .sort((a, b) => Number(a.status === 'concluido') - Number(b.status === 'concluido') || a.created_at.localeCompare(b.created_at));
  const isSub = !!goalModal.editing?.parent_id;

  // ---------- Objetivos ----------
  const openGoal = (goal?: YearGoal) => {
    setGoalForm(goal ? {
      title: goal.title,
      area: goal.area,
      why: goal.why ?? '',
      quarter: goal.quarter ? String(goal.quarter) : '',
      obstacle: goal.obstacle ?? '',
      if_then: goal.if_then ?? '',
      status: goal.status,
    } : emptyGoal);
    setShowMore(!!(goal?.why || goal?.obstacle || goal?.if_then));
    setGoalModal({ open: true, editing: goal ?? null });
  };

  const closeGoal = () => setGoalModal({ open: false, editing: null });

  const saveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalForm.title.trim()) return;
    setSaving(true);
    const data = {
      year,
      title: goalForm.title.trim(),
      area: goalForm.area,
      why: textOrNull(goalForm.why),
      quarter: goalForm.quarter ? Number(goalForm.quarter) : null,
      obstacle: textOrNull(goalForm.obstacle),
      if_then: textOrNull(goalForm.if_then),
      status: goalForm.status,
    };
    const { error } = goalModal.editing
      ? await supabase.from('year_goals').update(data).eq('id', goalModal.editing.id)
      : await supabase.from('year_goals').insert([data]);
    setSaving(false);
    if (error) { showToast('Erro ao salvar objetivo.', 'error'); return; }
    showToast(goalModal.editing ? 'Salvo!' : 'Objetivo criado!');
    if (!goalModal.editing && active.length >= MAX_FOCUS) {
      showToast(`Você já tem ${active.length + 1} objetivos ativos. Considere pausar algum para manter o foco.`, 'info');
    }
    closeGoal();
    onChange();
  };

  const deleteGoal = async (goal: YearGoal) => {
    const ok = await confirmAction({
      title: 'Deletar objetivo?',
      message: goal.parent_id
        ? `A submeta "${goal.title}" será apagada.`
        : `"${goal.title}", suas submetas, resultados-chave e alavancas serão apagados.`,
      confirmLabel: 'Deletar',
      danger: true,
    });
    if (!ok) return;
    const { error } = await supabase.from('year_goals').delete().eq('id', goal.id);
    if (error) showToast('Erro ao deletar.', 'error');
    else showToast('Objetivo removido.', 'info');
    onChange();
  };

  const setStatus = async (goal: YearGoal, status: GoalStatus) => {
    const { error } = await supabase.from('year_goals').update({ status }).eq('id', goal.id);
    if (error) { showToast('Erro ao salvar.', 'error'); return; }
    if (status === 'concluido') showToast('Objetivo concluído! 🎉');
    onChange();
  };

  // ---------- Submetas ----------
  const addSub = async (goal: YearGoal) => {
    const title = (subDrafts[goal.id] ?? '').trim();
    if (!title) return;
    const { error } = await supabase.from('year_goals').insert([{
      year,
      title,
      area: goal.area,
      quarter: goal.quarter,
      parent_id: goal.id,
      status: 'ativo',
    }]);
    if (error) {
      showToast(error.code === 'PGRST204' ? 'Falta rodar supabase/submetas.sql no Supabase.' : 'Erro ao criar submeta.', 'error');
      return;
    }
    setSubDrafts(prev => ({ ...prev, [goal.id]: '' }));
    onChange();
  };

  const toggleSub = (sub: YearGoal) => setStatus(sub, sub.status === 'concluido' ? 'ativo' : 'concluido');

  // ---------- Resultados-chave e alavancas ----------
  const openMeasure = (goalId: string, kind: MeasureKind, m?: YearMeasure) => {
    setMeasureForm(m ? {
      title: m.title,
      unit: m.unit ?? '',
      start_value: m.start_value?.toString() ?? '',
      target_value: m.target_value?.toString() ?? '',
      current_value: m.current_value?.toString() ?? '',
      frequency: m.frequency ?? '',
      quarter: m.quarter ? String(m.quarter) : '',
    } : emptyMeasure);
    setMeasureModal({ open: true, goalId, kind, editing: m ?? null });
  };

  const closeMeasure = () => setMeasureModal(prev => ({ ...prev, open: false, editing: null }));

  const saveMeasure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!measureForm.title.trim()) return;
    const isResult = measureModal.kind === 'resultado';
    if (isResult && measureForm.target_value.trim() === '') { showToast('Defina a meta (aonde quer chegar).', 'error'); return; }
    setSaving(true);
    const data = {
      goal_id: measureModal.goalId,
      kind: measureModal.kind,
      title: measureForm.title.trim(),
      unit: textOrNull(measureForm.unit),
      start_value: isResult ? numOrNull(measureForm.start_value) ?? 0 : null,
      target_value: isResult ? numOrNull(measureForm.target_value) : null,
      current_value: isResult ? numOrNull(measureForm.current_value) ?? numOrNull(measureForm.start_value) ?? 0 : null,
      frequency: isResult ? null : textOrNull(measureForm.frequency),
      quarter: measureForm.quarter ? Number(measureForm.quarter) : null,
    };
    const { error } = measureModal.editing
      ? await supabase.from('year_measures').update(data).eq('id', measureModal.editing.id)
      : await supabase.from('year_measures').insert([data]);
    setSaving(false);
    if (error) { showToast('Erro ao salvar.', 'error'); return; }
    showToast(measureModal.editing ? 'Atualizado!' : isResult ? 'Resultado-chave criado!' : 'Alavanca criada!');
    closeMeasure();
    onChange();
  };

  const deleteMeasure = async () => {
    const m = measureModal.editing;
    if (!m) return;
    if (!(await confirmAction({ title: 'Deletar?', message: `"${m.title}" será removido.`, confirmLabel: 'Deletar', danger: true }))) return;
    const { error } = await supabase.from('year_measures').delete().eq('id', m.id);
    if (error) { showToast('Erro ao deletar.', 'error'); return; }
    closeMeasure();
    onChange();
  };

  // Atualização rápida do valor atual direto no card.
  const saveCurrent = async (m: YearMeasure) => {
    const raw = drafts[m.id];
    if (raw === undefined) return;
    const value = numOrNull(raw);
    setDrafts(prev => { const next = { ...prev }; delete next[m.id]; return next; });
    if (value === m.current_value || (value !== null && Number.isNaN(value))) return;
    const { error } = await supabase.from('year_measures').update({ current_value: value }).eq('id', m.id);
    if (error) { showToast('Erro ao atualizar o número.', 'error'); return; }
    onChange();
  };

  const renderGoal = (goal: YearGoal) => {
    const area = areaOf(goal.area);
    const progress = goalProgress(goal, measures, goals);
    const subs = subsOf(goal.id);
    const subsDone = subs.filter(g => g.status === 'concluido').length;
    const results = measures.filter(m => m.goal_id === goal.id && m.kind === 'resultado');
    const levers = measures.filter(m => m.goal_id === goal.id && m.kind === 'alavanca');
    const open = !!expanded[goal.id];
    const detailCount = results.length + levers.length + (goal.why ? 1 : 0) + (goal.obstacle || goal.if_then ? 1 : 0);

    return (
      <article key={goal.id} className={`${styles.goalCard} ${goal.status !== 'ativo' ? styles.goalMuted : ''} glass-panel`} style={{ borderLeftColor: area.color }}>
        <header className={styles.goalHeader}>
          <div className={styles.goalHeading}>
            <span className={styles.goalArea} style={{ color: area.color }}>{area.label}{goal.quarter ? ` · T${goal.quarter}` : ''}</span>
            <button className={styles.goalTitle} onClick={() => openGoal(goal)}>{goal.title}</button>
          </div>
          <select
            className={`${styles.statusSelect} ${styles[`status_${goal.status}`]}`}
            value={goal.status}
            onChange={e => setStatus(goal, e.target.value as GoalStatus)}
            aria-label="Status do objetivo"
          >
            {(Object.keys(statusLabels) as GoalStatus[]).map(st => <option key={st} value={st}>{statusLabels[st]}</option>)}
          </select>
        </header>

        {progress !== null && (
          <div className={styles.progressRow}>
            <span className={styles.progressBar}><span style={{ width: `${Math.round(progress * 100)}%`, background: area.color }} /></span>
            <span className={styles.progressValue}>{Math.round(progress * 100)}%</span>
          </div>
        )}

        <section className={styles.subs} aria-label="Submetas">
          {subs.length > 0 && (
            <div className={styles.subsHeader}>
              <span>Submetas</span>
              <span className={styles.subsCount}>{subsDone}/{subs.length}</span>
            </div>
          )}
          {subs.map(sg => {
            const done = sg.status === 'concluido';
            return (
              <div key={sg.id} className={`${styles.subRow} ${done ? styles.subDone : ''}`}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={done}
                  aria-label={`Concluir submeta ${sg.title}`}
                  className={`${styles.subCheck} ${done ? styles.subCheckOn : ''}`}
                  onClick={() => toggleSub(sg)}
                >
                  {done && '✓'}
                </button>
                <button className={styles.subTitle} onClick={() => openGoal(sg)}>{sg.title}</button>
                {sg.quarter && sg.quarter !== goal.quarter && <span className={styles.chipSmall}>T{sg.quarter}</span>}
              </div>
            );
          })}
          <form className={styles.subAdd} onSubmit={e => { e.preventDefault(); addSub(goal); }}>
            <input
              value={subDrafts[goal.id] ?? ''}
              onChange={e => { const v = e.target.value; setSubDrafts(prev => ({ ...prev, [goal.id]: v })); }}
              placeholder="+ Adicionar submeta"
              aria-label={`Nova submeta de ${goal.title}`}
            />
          </form>
        </section>

        <button
          className={styles.detailsToggle}
          onClick={() => setExpanded(prev => ({ ...prev, [goal.id]: !open }))}
          aria-expanded={open}
        >
          {open ? '▾' : '▸'} Detalhes{detailCount ? ` (${detailCount})` : ''}
        </button>

        {open && (
          <div className={styles.details}>
            {goal.why && <div className={styles.whyBox}><span>Por quê</span>{goal.why}</div>}

            <section className={styles.block}>
              <div className={styles.blockHeader}>
                <h4>📊 Resultados-chave</h4>
                <button className={styles.addLink} onClick={() => openMeasure(goal.id, 'resultado')}>+ resultado</button>
              </div>
              {results.map(m => {
                const pm = measureProgress(m);
                return (
                  <div key={m.id} className={styles.measure}>
                    <button className={styles.measureTitle} onClick={() => openMeasure(goal.id, 'resultado', m)}>
                      {m.title}{m.quarter ? <span className={styles.chipSmall}>T{m.quarter}</span> : null}
                    </button>
                    <div className={styles.measureNumbers}>
                      <input
                        className={styles.currentInput}
                        inputMode="decimal"
                        value={drafts[m.id] ?? (m.current_value?.toString() ?? '')}
                        onChange={e => setDrafts(prev => ({ ...prev, [m.id]: e.target.value }))}
                        onBlur={() => saveCurrent(m)}
                        onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                        aria-label={`Valor atual de ${m.title}`}
                        title="Valor atual: edite e aperte Enter"
                      />
                      <span className={styles.target}>/ {fmtNumber(m.target_value, m.unit)}</span>
                      <span className={styles.measurePct}>{pm !== null ? `${Math.round(pm * 100)}%` : ''}</span>
                    </div>
                    <span className={styles.measureBar}><span style={{ width: `${Math.round((pm ?? 0) * 100)}%`, background: area.color }} /></span>
                  </div>
                );
              })}
            </section>

            <section className={styles.block}>
              <div className={styles.blockHeader}>
                <h4>⚙️ Alavancas</h4>
                <button className={styles.addLink} onClick={() => openMeasure(goal.id, 'alavanca')}>+ alavanca</button>
              </div>
              {levers.map(m => (
                <button key={m.id} className={styles.lever} onClick={() => openMeasure(goal.id, 'alavanca', m)}>
                  <span>{m.title}</span>
                  {m.frequency && <span className={styles.frequency}>{m.frequency}</span>}
                </button>
              ))}
            </section>

            {(goal.obstacle || goal.if_then) && (
              <section className={styles.woop}>
                {goal.obstacle && <p><span>🧱 Obstáculo:</span> {goal.obstacle}</p>}
                {goal.if_then && <p><span>↪️ Se acontecer:</span> {goal.if_then}</p>}
              </section>
            )}

            <footer className={styles.goalFooter}>
              <button className="btn btn-secondary" onClick={() => openGoal(goal)}>Editar</button>
              <button className="btn btn-danger" onClick={() => deleteGoal(goal)}>Deletar</button>
            </footer>
          </div>
        )}
      </article>
    );
  };

  const isResult = measureModal.kind === 'resultado';

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Objetivos de {year}</h2>
        </div>
        <button className="btn btn-primary" onClick={() => openGoal()}>+ Novo objetivo</button>
      </div>

      {active.length > MAX_FOCUS && (
        <div className={styles.warning}>
          ⚠️ {active.length} objetivos ativos. Acima de {MAX_FOCUS}, o foco se divide: pause os menos importantes.
        </div>
      )}

      {sorted.length === 0 ? (
        <div className={styles.emptyBig}>Nenhum objetivo ainda.</div>
      ) : (
        <div className={styles.goalGrid}>{sorted.map(renderGoal)}</div>
      )}

      <Modal isOpen={goalModal.open} onClose={closeGoal} title={isSub ? 'Editar submeta' : goalModal.editing ? 'Editar objetivo' : 'Novo objetivo'}>
        <form onSubmit={saveGoal} className={styles.form}>
          <div className={styles.formGroup}>
            <label>{isSub ? 'Submeta *' : 'Objetivo *'}</label>
            <input value={goalForm.title} onChange={e => setGoalForm({ ...goalForm, title: e.target.value })} placeholder="Ex: Ter uma operação de IA com 10 clientes recorrentes" required autoFocus />
          </div>
          <div className={styles.formRow}>
            {!isSub && (
            <div className={styles.formGroup}>
              <label>Área</label>
              <select value={goalForm.area} onChange={e => setGoalForm({ ...goalForm, area: e.target.value as Area })}>
                {areas.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            )}
            <div className={styles.formGroup}>
              <label>Prazo</label>
              <select value={goalForm.quarter} onChange={e => setGoalForm({ ...goalForm, quarter: e.target.value })}>
                <option value="">Ano todo</option>
                {[1, 2, 3, 4].map(q => <option key={q} value={q}>Até o fim do T{q}</option>)}
              </select>
            </div>
          </div>
          {!isSub && (
            <button type="button" className={styles.detailsToggle} onClick={() => setShowMore(v => !v)} aria-expanded={showMore}>
              {showMore ? '▾' : '▸'} Mais detalhes
            </button>
          )}
          {!isSub && showMore && (
          <>
          <div className={styles.formGroup}>
            <label>Por que isso importa</label>
            <textarea rows={2} value={goalForm.why} onChange={e => setGoalForm({ ...goalForm, why: e.target.value })} placeholder="O motivo que vai te segurar quando a vontade acabar" />
          </div>
          <div className={styles.formGroup}>
            <label>🧱 Obstáculo mais provável</label>
            <input value={goalForm.obstacle} onChange={e => setGoalForm({ ...goalForm, obstacle: e.target.value })} placeholder="O que, em mim ou na rotina, mais pode atrapalhar" />
          </div>
          <div className={styles.formGroup}>
            <label>↪️ Se esse obstáculo aparecer, eu vou...</label>
            <input value={goalForm.if_then} onChange={e => setGoalForm({ ...goalForm, if_then: e.target.value })} placeholder="Ex: se eu pular a prospecção de manhã, faço 30 min depois do almoço" />
          </div>
          </>
          )}
          {goalModal.editing && (
            <div className={styles.formGroup}>
              <label>Status</label>
              <select value={goalForm.status} onChange={e => setGoalForm({ ...goalForm, status: e.target.value as GoalStatus })}>
                {(Object.keys(statusLabels) as GoalStatus[]).map(s => <option key={s} value={s}>{statusLabels[s]}</option>)}
              </select>
            </div>
          )}
          <div className={styles.formActions}>
            {goalModal.editing && (
              <button type="button" className="btn btn-danger" onClick={() => { const g = goalModal.editing!; closeGoal(); deleteGoal(g); }}>Deletar</button>
            )}
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? 'Salvando...' : goalModal.editing ? 'Salvar' : 'Criar objetivo'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={measureModal.open}
        onClose={closeMeasure}
        title={`${measureModal.editing ? 'Editar' : 'Novo'} ${isResult ? 'resultado-chave' : 'alavanca'}`}
      >
        <form onSubmit={saveMeasure} className={styles.form}>
          <div className={styles.formGroup}>
            <label>{isResult ? 'Resultado *' : 'Ação *'}</label>
            <input
              value={measureForm.title}
              onChange={e => setMeasureForm({ ...measureForm, title: e.target.value })}
              placeholder={isResult ? 'Ex: Faturamento mensal recorrente' : 'Ex: Abordar donos de imobiliária'}
              required
              autoFocus
            />
          </div>
          {isResult ? (
            <>
              <div className={styles.formRow3}>
                <div className={styles.formGroup}>
                  <label>Início</label>
                  <input inputMode="decimal" value={measureForm.start_value} onChange={e => setMeasureForm({ ...measureForm, start_value: e.target.value })} placeholder="0" />
                </div>
                <div className={styles.formGroup}>
                  <label>Atual</label>
                  <input inputMode="decimal" value={measureForm.current_value} onChange={e => setMeasureForm({ ...measureForm, current_value: e.target.value })} placeholder="= início" />
                </div>
                <div className={styles.formGroup}>
                  <label>Meta *</label>
                  <input inputMode="decimal" value={measureForm.target_value} onChange={e => setMeasureForm({ ...measureForm, target_value: e.target.value })} placeholder="10000" />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Unidade</label>
                  <input value={measureForm.unit} onChange={e => setMeasureForm({ ...measureForm, unit: e.target.value })} placeholder="R$, clientes, kg..." />
                </div>
                <div className={styles.formGroup}>
                  <label>Trimestre</label>
                  <select value={measureForm.quarter} onChange={e => setMeasureForm({ ...measureForm, quarter: e.target.value })}>
                    <option value="">Ano todo</option>
                    {[1, 2, 3, 4].map(q => <option key={q} value={q}>T{q}</option>)}
                  </select>
                </div>
              </div>
            </>
          ) : (
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Frequência</label>
                <input value={measureForm.frequency} onChange={e => setMeasureForm({ ...measureForm, frequency: e.target.value })} placeholder="Ex: 5x por semana" />
              </div>
              <div className={styles.formGroup}>
                <label>Trimestre</label>
                <select value={measureForm.quarter} onChange={e => setMeasureForm({ ...measureForm, quarter: e.target.value })}>
                  <option value="">Ano todo</option>
                  {[1, 2, 3, 4].map(q => <option key={q} value={q}>T{q}</option>)}
                </select>
              </div>
            </div>
          )}
          <div className={styles.formActions}>
            {measureModal.editing && <button type="button" className="btn btn-danger" onClick={deleteMeasure}>Deletar</button>}
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={saving}>
              {saving ? 'Salvando...' : measureModal.editing ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
