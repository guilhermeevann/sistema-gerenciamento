"use client";

import { ReactNode, useEffect, useRef } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  // Só fecha se o clique começou E terminou no fundo: arrastar para selecionar
  // texto dentro do formulário e soltar fora não descarta o que foi digitado.
  const pressedOnOverlay = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onMouseDown={e => { pressedOnOverlay.current = e.target === e.currentTarget; }}
      onClick={e => { if (pressedOnOverlay.current && e.target === e.currentTarget) onClose(); }}
    >
      <div className={`${styles.modal} glass-panel`} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.header}>
          <h2 className="h3">{title}</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar" title="Fechar (Esc)">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className={styles.content}>
          {children}
        </div>
      </div>
    </div>
  );
}
