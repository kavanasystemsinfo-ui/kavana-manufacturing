interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** El panel clásico es claro: sin este dato, el texto se pinta casi invisible. */
  isClassic?: boolean;
}

/** Estado vacío consistente: icono + título + descripción + acción opcional. */
export function EmptyState({ icon, title, description, action, isClassic }: EmptyStateProps) {
  return (
    <div className="py-12 text-center">
      {icon && <div className="mb-3 text-4xl" aria-hidden="true">{icon}</div>}
      <p className={`text-lg font-bold ${isClassic ? 'text-slate-900' : 'text-slate-300'}`}>{title}</p>
      {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
