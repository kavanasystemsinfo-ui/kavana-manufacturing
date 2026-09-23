import type { Incidencia } from '../../api/admin-entities.js';
import { KanbanColumns } from '../ui/KanbanColumns.js';
import { IncidenciaPhoto } from '../IncidenciaPhoto.js';
import { COLUMNAS_INCIDENCIAS, incidenciasHuerfanas } from '../../utils/incidencias-kanban.js';

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
 * Tablero de incidencias, el mismo para el supervisor y para el administrador.
 *
 * Estuvo duplicado, una copia por rol con su propia lista de columnas, y eso costó
 * un trabajo repetido. Las columnas viven ahora en `utils/incidencias-kanban.ts`,
 * atadas a los estados que acepta el backend.
 *
 * Sustituye a los botones de avance, que solo permitían ir hacia delante
 * (Iniciar → Resolver → Cerrar) y no dejaban rectificar: arrastrando se mueve una
 * incidencia a cualquier columna, incluso volver a abrirla.
 */
export function IncidenciasKanban({ incidencias, onStatusChange, onDelete }: Props) {
  const huerfanas = incidenciasHuerfanas(incidencias);

  return (
    <div className="space-y-3">
      <KanbanColumns
        columns={[...COLUMNAS_INCIDENCIAS]}
        items={incidencias}
        onMove={(id, status) => void onStatusChange(id, status)}
        ariaLabel="Incidencias por estado"
        emptyLabel="Sin incidencias"
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

      {huerfanas.length > 0 && (
        <div className="rounded-lg border border-amber-700 bg-amber-900/20 px-4 py-3 text-sm text-amber-200">
          {huerfanas.length === 1
            ? '1 incidencia tiene un estado que no está en el tablero:'
            : `${huerfanas.length} incidencias tienen un estado que no está en el tablero:`}{' '}
          {huerfanas.map((i) => i.title).join(', ')}. Se quedan fuera del flujo hasta corregir su estado.
        </div>
      )}
    </div>
  );
}
