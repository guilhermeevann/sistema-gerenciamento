"use client";

import { useEffect, useState } from 'react';
import Modal from './Modal';
import styles from './ConfirmDialog.module.css';

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  // Exige digitar este texto antes de confirmar (para ações em massa).
  requireText?: string;
}

interface Pending extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

let openDialog: ((p: Pending) => void) | null = null;

// Substitui o confirm() nativo: `if (!(await confirmAction({...}))) return;`
export const confirmAction = (options: ConfirmOptions) =>
  new Promise<boolean>(resolve => {
    if (!openDialog) { resolve(window.confirm(options.title)); return; }
    openDialog({ ...options, resolve });
  });

export default function ConfirmDialog() {
  const [pending, setPending] = useState<Pending | null>(null);
  const [typed, setTyped] = useState('');

  useEffect(() => {
    openDialog = p => { setTyped(''); setPending(p); };
    return () => { openDialog = null; };
  }, []);

  const finish = (ok: boolean) => {
    pending?.resolve(ok);
    setPending(null);
  };

  const blocked = !!pending?.requireText && typed.trim().toUpperCase() !== pending.requireText.toUpperCase();

  return (
    <Modal isOpen={!!pending} onClose={() => finish(false)} title={pending?.title ?? ''}>
      <form
        className={styles.body}
        onSubmit={e => { e.preventDefault(); if (!blocked) finish(true); }}
      >
        {pending?.message && <p className={styles.message}>{pending.message}</p>}
        {pending?.requireText && (
          <label className={styles.typeLabel}>
            <span>Digite <strong>{pending.requireText}</strong> para confirmar</span>
            <input value={typed} onChange={e => setTyped(e.target.value)} autoFocus />
          </label>
        )}
        <div className={styles.actions}>
          <button type="button" className="btn btn-secondary" onClick={() => finish(false)}>Cancelar</button>
          <button
            type="submit"
            className={`btn ${pending?.danger ? styles.dangerSolid : 'btn-primary'}`}
            disabled={blocked}
            autoFocus={!pending?.requireText}
          >
            {pending?.confirmLabel ?? 'Confirmar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
