import { useEffect, useState } from 'react';

interface ConfirmButtonProps {
  label: string;
  /** Texto del segundo clic. Explícito, no un «OK» que se pulsa por inercia. */
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  className: string;
  confirmClassName?: string;
  /** Aria-label del botón, para lectores de pantalla cuando el texto es corto. */
  ariaLabel?: string;
}

/**
 * Botón destructivo con confirmación en el propio botón.
 *
 * En planta se pulsa con guantes y con prisa, y borrar una orden de 122 piezas
 * estaba a un clic de «Completar». El segundo clic caduca solo, para que nadie
 * se encuentre el botón armado cinco minutos después.
 */
export function ConfirmButton({
  label,
  confirmLabel = '¿Seguro?',
  cancelLabel = 'No',
  onConfirm,
  className,
  confirmClassName,
  ariaLabel,
}: ConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 5000);
    return () => clearTimeout(timer);
  }, [confirming]);

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1" role="group" aria-label={`Confirmar ${label}`}>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            onConfirm();
          }}
          className={confirmClassName ?? className}
        >
          {confirmLabel}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className={className}>
          {cancelLabel}
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      title={ariaLabel ?? label}
      onClick={() => setConfirming(true)}
      className={className}
    >
      {label}
    </button>
  );
}
