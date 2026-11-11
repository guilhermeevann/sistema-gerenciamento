"use client";

import { useEffect, useState } from 'react';
import styles from './ThemeToggle.module.css';

import { THEME_KEY as KEY } from '@/lib/theme';

export type ThemeChoice = 'light' | 'dark' | 'system';

const apply = (choice: ThemeChoice) => {
  const resolved = choice === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : choice;
  document.documentElement.setAttribute('data-theme', resolved);
  return resolved;
};

const options: { value: ThemeChoice; icon: string; label: string }[] = [
  { value: 'light', icon: '☀', label: 'Tema claro' },
  { value: 'dark', icon: '☾', label: 'Tema escuro' },
  { value: 'system', icon: '◐', label: 'Seguir o sistema' },
];

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [choice, setChoice] = useState<ThemeChoice>('system');
  const [resolved, setResolved] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY) as ThemeChoice | null;
      if (saved === 'light' || saved === 'dark') setChoice(saved);
    } catch {}
    setResolved(document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
  }, []);

  // Em "sistema", acompanha a troca de claro/escuro do aparelho em tempo real.
  useEffect(() => {
    if (choice !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = () => setResolved(apply('system'));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [choice]);

  const choose = (value: ThemeChoice) => {
    setChoice(value);
    try {
      if (value === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, value);
    } catch {}
    setResolved(apply(value));
  };

  // Compacto (menu recolhido / celular): um botão que alterna claro ↔ escuro.
  if (compact) {
    const next = resolved === 'light' ? 'dark' : 'light';
    return (
      <button className={styles.single} onClick={() => choose(next)} aria-label={next === 'light' ? 'Mudar para tema claro' : 'Mudar para tema escuro'} title="Alternar tema">
        <span aria-hidden="true">{next === 'light' ? '☀' : '☾'}</span>
      </button>
    );
  }

  return (
    <div className={styles.group} role="radiogroup" aria-label="Tema">
      {options.map(o => (
        <button
          key={o.value}
          role="radio"
          aria-checked={choice === o.value}
          aria-label={o.label}
          title={o.label}
          className={`${styles.option} ${choice === o.value ? styles.active : ''}`}
          onClick={() => choose(o.value)}
        >
          <span aria-hidden="true">{o.icon}</span>
        </button>
      ))}
    </div>
  );
}
