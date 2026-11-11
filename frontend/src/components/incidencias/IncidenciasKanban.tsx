import { useEffect, useState } from 'react';
import { listUsers, type Incidencia } from '../../api/admin-entities.js';
import { detalleIncidencia } from '../../utils/incidencia-detalle.js';
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
  /** Nombres por id para mostrar puesto y orden en la tarjeta (los pone el panel). */
  puestos?: Record<string, string>;
  ordenes?: Record<string, string>;
  /** Tema clásico (claro): tarjetas y avisos sin los colores del tema oscuro. */
  isClassic?: boolean;
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
export function IncidenciasKanban({ incidencias, onStatusChange, onDelete, puestos, ordenes, isClassic }: Props) {
  const huerfanas = incidenciasHuerfanas(incidencias);

  // Quién reportó: la incidencia guarda su id; el nombre se pide una vez. Si el
  // rol no puede listar usuarios, la tarjeta simplemente no enseña el operario.
  const [operarios, setOperarios] = useState<Record<string, string>>({});
  useEffect(() => {
    let vivo = true;
    listUsers()
      .then((users) => {
        if (!vivo) return;
        const mapa: Record<string, string> = {};
        for (const u of users) {
          mapa[u.id] = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.username;
        }
        setOperarios(mapa);
      })
      .catch(() => undefined);
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <div className="space-y-3">
      <KanbanColumns
        columns={[...COLUMNAS_INCIDENCIAS]}
        items={incidencias}
        onMove={(id, status) => void onStatusChange(id, status)}
        ariaLabel="Incidencias por estado"
        emptyLabel="Sin incidencias"
        isClassic={isClassic}
        renderCard={(incidencia) => {
          const detalle = detalleIncidencia(incidencia, { puestos, ordenes, operarios });
          return (
          <div>
            <p className={`text-sm font-bold ${isClassic ? 'text-slate-900' : 'text-white'}`}>{incidencia.title}</p>
            <p className={`mt-1 text-[11px] ${isClassic ? 'text-slate-500' : 'text-slate-400'}`}>
              {typeLabels[incidencia.type] ?? incidencia.type} · {detalle.cuando}
            </p>
            {(detalle.puesto || detalle.operario || detalle.orden) && (
              <p className={`mt-1 text-[11px] font-semibold ${isClassic ? 'text-slate-700' : 'text-slate-200'}`}>
                {[
                  detalle.puesto && `Puesto: ${detalle.puesto}`,
                  detalle.operario && `Operario: ${detalle.operario}`,
                  detalle.orden && `Orden: ${detalle.orden}`,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
            {incidencia.description && (
              <p className={`mt-2 line-clamp-2 text-xs ${isClassic ? 'text-slate-600' : 'text-slate-300'}`}>{incidencia.description}</p>
            )}
            {incidencia.photo_data_url && (
              <div className="mt-2">
                <IncidenciaPhoto src={incidencia.photo_data_url} alt="Evidencia de la incidencia" isClassic={isClassic} />
              </div>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (confirm('¿Eliminar esta incidencia?')) void onDelete(incidencia.id);
                }}
                className={`mt-2 rounded-full px-3 py-1 text-[11px] font-bold transition ${isClassic ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-red-600/20 text-red-300 hover:bg-red-600/40'}`}
              >
                Eliminar
              </button>
            )}
          </div>
          );
        }}
      />

      {huerfanas.length > 0 && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${isClassic ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-amber-700 bg-amber-900/20 text-amber-200'}`}>
          {huerfanas.length === 1
            ? '1 incidencia tiene un estado que no está en el tablero:'
            : `${huerfanas.length} incidencias tienen un estado que no está en el tablero:`}{' '}
          {huerfanas.map((i) => i.title).join(', ')}. Se quedan fuera del flujo hasta corregir su estado.
        </div>
      )}
    </div>
  );
}
