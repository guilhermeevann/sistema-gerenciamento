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
  const dialogRef = useRef<HTMLDivElement>(null);
  // onClose costuma vir como função inline; guardar em ref evita reinstalar os listeners a cada render.
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    // Ao fechar, o foco volta para quem abriu a janela (teclado não se perde na página).
    const opener = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCloseRef.current(); return; }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      // Tab circula só dentro da janela enquanto ela está aberta.
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className={styles.overlay}
      onMouseDown={e => { pressedOnOverlay.current = e.target === e.currentTarget; }}
      onClick={e => { if (pressedOnOverlay.current && e.target === e.currentTarget) onClose(); }}
    >
      <div ref={dialogRef} className={`${styles.modal} glass-panel`} role="dialog" aria-modal="true" aria-label={title}>
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
