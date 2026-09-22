interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

/** Estado de error consistente: mensaje + botón de reintentar. */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="mb-6 rounded-xl border-2 border-red-500/40 bg-red-500/10 p-4 text-center text-sm text-red-300" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-lg bg-red-500/20 px-4 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/30"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
