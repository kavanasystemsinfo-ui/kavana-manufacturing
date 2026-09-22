import type { Incidencia } from '../../api/admin-entities.js';
import { KanbanColumns } from '../ui/KanbanColumns.js';
import { IncidenciaPhoto } from '../IncidenciaPhoto.js';

const COLUMNS = [
  { status: 'abierto', title: 'Abiertas' },
  { status: 'en_progreso', title: 'En progreso' },
  { status: 'resuelto', title: 'Resueltas' },
  { status: 'cerrado', title: 'Cerradas' },
];

const typeLabels: Record<string, string> = {
  calidad: 'Calidad',
  seguridad: 'Seguridad',
  mantenimiento: 'Mantenimiento',
  produccion: 'Producción',
  otro: 'Otro',
};

interface Props {
  incidencias: Incidencia[];
  onStatusChange: (id: string, status: string) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

/**
 * Tablero de incidencias del supervisor.
 *
 * Sustituye a los botones de avance, que solo permitían ir hacia delante
 * (Iniciar → Resolver → Cerrar) y no dejaban rectificar. Arrastrando se puede
 * mover una incidencia a cualquier columna, incluso volver a abrirla.
 */
export function IncidenciasKanban({ incidencias, onStatusChange, onDelete }: Props) {
  return (
    <KanbanColumns
      columns={COLUMNS}
      items={incidencias}
      onMove={(id, status) => void onStatusChange(id, status)}
      ariaLabel="Incidencias por estado"
      renderCard={(incidencia) => (
        <div>
          <p className="text-sm font-bold text-white">{incidencia.title}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            {typeLabels[incidencia.type] ?? incidencia.type} ·{' '}
            {new Date(incidencia.created_at).toLocaleDateString('es-ES')}
          </p>
          {incidencia.description && (
            <p className="mt-2 line-clamp-2 text-xs text-slate-300">{incidencia.description}</p>
          )}
          {incidencia.photo_data_url && (
            <div className="mt-2">
              <IncidenciaPhoto src={incidencia.photo_data_url} alt="Evidencia de la incidencia" />
            </div>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                if (confirm('¿Eliminar esta incidencia?')) void onDelete(incidencia.id);
              }}
              className="mt-2 rounded-full bg-red-600/20 px-3 py-1 text-[11px] font-bold text-red-300 transition hover:bg-red-600/40"
            >
              Eliminar
            </button>
          )}
        </div>
      )}
    />
  );
}
