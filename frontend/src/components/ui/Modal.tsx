import { useEffect, useRef } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string;
}

/**
 * Modal base: overlay, cierre con Esc, focus trap simple (devuelve el foco al
 * cerrar) y aria-modal. Los modales existentes (Incidencia, FailedEvents, Help)
 * migran a este para eliminar duplicación.
 */
export function Modal({ isOpen, onClose, title, children, footer, maxWidthClass = 'max-w-lg' }: ModalProps) {
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement;
    modalRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${maxWidthClass} rounded-2xl border-2 border-kavana-steel/30 bg-kavana-panel p-6 shadow-2xl outline-none`}
      >
        <div className="mb-4 flex items-center justify-between border-b border-kavana-steel/20 pb-3">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full bg-kavana-surface px-3 py-1 text-sm font-bold text-slate-300 transition hover:bg-kavana-steel/30 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">{children}</div>
        {footer && <div className="mt-4 flex justify-end gap-2 border-t border-kavana-steel/20 pt-4">{footer}</div>}
      </div>
    </div>
  );
}
