/** Spinner de carga consistente para toda la app. */
export function Loading({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="py-12 text-center text-slate-400" role="status" aria-live="polite">
      <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-kavana-orange border-t-transparent" />
      {label}
    </div>
  );
}
