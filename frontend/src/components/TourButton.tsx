interface TourButtonProps {
  onClick: () => void;
}

/**
 * Botón del tour guiado de la pestaña abierta. Blanco con borde azul grueso y
 * una brújula, para que destaque sobre la cabecera oscura de los dos diseños.
 */
export function TourButton({ onClick }: TourButtonProps) {
  return (
    <button
      type="button"
      data-tour-step="header-tour"
      onClick={onClick}
      title="Tour guiado de esta pestaña"
      className="inline-flex min-h-[64px] items-center gap-3 rounded-2xl border-4 border-blue-500 bg-white px-6 py-3 text-lg font-extrabold text-blue-700 shadow-lg transition hover:bg-blue-50 active:scale-95"
    >
      <svg
        className="h-7 w-7 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M15.5 8.5l-2 5-5 2 2-5 5-2z" fill="currentColor" />
      </svg>
      Tour guiado
    </button>
  );
}
