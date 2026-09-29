import { alertClass } from '../../utils/ui-tokens.js';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  isClassic?: boolean;
}

/** Estado de error consistente: mensaje + botón de reintentar. */
export function ErrorState({ message, onRetry, isClassic }: ErrorStateProps) {
  return (
    <div className={`mb-6 text-center ${alertClass('error', isClassic)}`} role="alert">
      <p>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-lg bg-red-500/20 px-4 py-2 text-xs font-bold transition hover:bg-red-500/30"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
