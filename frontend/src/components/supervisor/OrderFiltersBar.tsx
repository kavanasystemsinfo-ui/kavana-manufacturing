import { useEffect, useState } from 'react';
import type { Workstation } from '../../api/supervisor.js';
import {
  ORDER_STATUS_PRESETS,
  presetFromStatus,
  statusFromPreset,
  type OrderFilters,
} from '../../utils/order-filters.js';
import { BUTTON_SECONDARY, INPUT, SURFACE, themed } from '../../utils/ui-tokens.js';

export type OrdersView = 'tablero' | 'lista';

interface OrderFiltersBarProps {
  isClassic?: boolean;
  filters: OrderFilters;
  onChange: (patch: Partial<OrderFilters>) => void;
  workstations: Workstation[];
  view: OrdersView;
  onViewChange: (view: OrdersView) => void;
  /** Órdenes que hay en pantalla con los filtros actuales. */
  total: number;
  hasMore: boolean;
  onLoadMore: () => void;
}

/**
 * Barra de filtros de órdenes, compartida por los dos temas.
 *
 * Sin esto el panel intentaba dibujar las 1.215 órdenes de la fábrica: 180.000 px
 * de scroll y ninguna forma de encontrar una orden concreta. El filtro va al
 * servidor, no a la vista: filtrar en el navegador no arregla la descarga.
 */
export function OrderFiltersBar({
  isClassic,
  filters,
  onChange,
  workstations,
  view,
  onViewChange,
  total,
  hasMore,
  onLoadMore,
}: OrderFiltersBarProps) {
  const [texto, setTexto] = useState(filters.q);

  // El buscador espera a que el usuario deje de teclear: una petición por letra
  // satura el backend y mueve la lista mientras se escribe.
  useEffect(() => {
    if (texto === filters.q) return;
    const timer = setTimeout(() => onChange({ q: texto }), 350);
    return () => clearTimeout(timer);
  }, [texto, filters.q, onChange]);

  // Si los filtros cambian por fuera (por ejemplo al limpiar), el cuadro se
  // sincroniza en vez de quedarse con texto viejo.
  useEffect(() => {
    setTexto(filters.q);
  }, [filters.q]);

  const activas = workstations.filter((w) => w.status === 'active');

  return (
    <section
      aria-label="Filtros de órdenes"
      className={`mb-4 flex flex-col gap-3 p-3 sm:flex-row sm:flex-wrap sm:items-end ${themed(SURFACE, isClassic)}`}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <label htmlFor="orden-buscar" className="text-xs font-semibold uppercase tracking-wide opacity-70">
          Buscar
        </label>
        <div className="relative">
          <input
            id="orden-buscar"
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="N.º de orden, modelo o puesto"
            className={themed(INPUT, isClassic)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1 sm:w-56">
        <label htmlFor="orden-estado" className="text-xs font-semibold uppercase tracking-wide opacity-70">
          Estado
        </label>
        <select
          id="orden-estado"
          value={presetFromStatus(filters.status)}
          onChange={(e) => onChange({ status: statusFromPreset(e.target.value) })}
          className={themed(INPUT, isClassic)}
        >
          {ORDER_STATUS_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1 sm:w-56">
        <label htmlFor="orden-puesto" className="text-xs font-semibold uppercase tracking-wide opacity-70">
          Puesto
        </label>
        <select
          id="orden-puesto"
          value={filters.workstationId}
          onChange={(e) => onChange({ workstationId: e.target.value })}
          className={themed(INPUT, isClassic)}
        >
          <option value="">Todos los puestos</option>
          {activas.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide opacity-70">Vista</span>
        <div
          role="group"
          aria-label="Vista de órdenes"
          className={`inline-flex rounded-lg p-0.5 ${isClassic ? 'bg-slate-100' : 'bg-kavana-dark ring-1 ring-kavana-steel/30'}`}
        >
          {(['tablero', 'lista'] as OrdersView[]).map((opcion) => (
            <button
              key={opcion}
              type="button"
              aria-pressed={view === opcion}
              onClick={() => onViewChange(opcion)}
              className={`min-h-[44px] rounded-md px-3 text-sm font-semibold transition ${
                view === opcion
                  ? 'bg-kavana-orange text-white'
                  : isClassic
                    ? 'text-slate-600 hover:bg-white'
                    : 'text-slate-300 hover:text-white'
              }`}
            >
              {opcion === 'tablero' ? 'Tablero' : 'Lista'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:ml-auto">
        <p className="text-sm opacity-80" role="status" aria-live="polite">
          {total === 1 ? '1 orden' : `${total} órdenes`}
        </p>
        {hasMore && (
          <button type="button" onClick={onLoadMore} className={themed(BUTTON_SECONDARY, isClassic)}>
            Cargar más
          </button>
        )}
      </div>
    </section>
  );
}
