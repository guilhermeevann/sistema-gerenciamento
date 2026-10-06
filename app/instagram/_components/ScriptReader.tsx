"use client";

import { useEffect, useState } from 'react';
import styles from './ScriptReader.module.css';
import { IgIdea, formatLabel } from '../types';

interface Props {
  ideas: IgIdea[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const SIZES = [1.1, 1.3, 1.55, 1.85, 2.2, 2.6];
const SIZE_KEY = 'script-reader-size';

// Leitura de roteiro em tela cheia para a hora de gravar: só gancho e roteiro, letra grande.
export default function ScriptReader({ ideas, index, onIndexChange, onClose }: Props) {
  const [sizeIdx, setSizeIdx] = useState(2);
  const idea = ideas[index];

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIZE_KEY);
      const saved = raw === null ? NaN : Number(raw);
      if (Number.isInteger(saved) && saved >= 0 && saved < SIZES.length) setSizeIdx(saved);
    } catch {}
  }, []);

  const changeSize = (delta: number) => setSizeIdx(prev => {
    const next = Math.min(SIZES.length - 1, Math.max(0, prev + delta));
    try { localStorage.setItem(SIZE_KEY, String(next)); } catch {}
    return next;
  });

  // Teclado: Esc fecha, ← → troca de roteiro, + − muda a letra. Trava a rolagem do fundo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && index < ideas.length - 1) onIndexChange(index + 1);
      else if (e.key === 'ArrowLeft' && index > 0) onIndexChange(index - 1);
      else if (e.key === '+' || e.key === '=') changeSize(1);
      else if (e.key === '-') changeSize(-1);
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [index, ideas.length, onClose, onIndexChange]);

  // Mantém a tela acesa enquanto lê (celular apoiado durante a gravação).
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then(l => { lock = l; }).catch(() => {});
    return () => { lock?.release().catch(() => {}); };
  }, []);

  useEffect(() => {
    document.getElementById('script-reader-body')?.scrollTo({ top: 0 });
  }, [index]);

  if (!idea) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={`Roteiro: ${idea.title}`}>
      <header className={styles.toolbar}>
        <span className={styles.counter}>{index + 1} / {ideas.length}</span>
        <div className={styles.controls}>
          <button className={styles.ctrl} onClick={() => changeSize(-1)} disabled={sizeIdx === 0} aria-label="Diminuir letra">A−</button>
          <button className={styles.ctrl} onClick={() => changeSize(1)} disabled={sizeIdx === SIZES.length - 1} aria-label="Aumentar letra">A+</button>
          <button className={styles.ctrl} onClick={() => onIndexChange(index - 1)} disabled={index === 0} aria-label="Roteiro anterior">←</button>
          <button className={styles.ctrl} onClick={() => onIndexChange(index + 1)} disabled={index === ideas.length - 1} aria-label="Próximo roteiro">→</button>
          <button className={`${styles.ctrl} ${styles.close}`} onClick={onClose} aria-label="Fechar leitura">✕</button>
        </div>
      </header>

      <div id="script-reader-body" className={styles.body} style={{ fontSize: `${SIZES[sizeIdx]}rem` }}>
        <div className={styles.content}>
          <p className={styles.meta}>
            {[formatLabel(idea.format) !== '—' ? formatLabel(idea.format) : null, idea.pillar].filter(Boolean).join(' · ')}
          </p>
          <h1 className={styles.title}>{idea.title}</h1>
          {idea.hook && (
            <section className={styles.hookBlock}>
              <span className={styles.label}>Gancho</span>
              <p className={styles.hook}>{idea.hook}</p>
            </section>
          )}
          {idea.description ? (
            <section>
              <span className={styles.label}>Roteiro</span>
              <p className={styles.script}>{idea.description}</p>
            </section>
          ) : (
            <p className={styles.emptyScript}>Esta ideia ainda não tem roteiro.</p>
          )}
        </div>
      </div>
    </div>
  );
}
