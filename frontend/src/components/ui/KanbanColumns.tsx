import type { ReactNode } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { COLUMN_ID_PREFIX, resolveDropTarget, type KanbanItem } from '../../utils/kanban-drop.js';

export interface KanbanColumnDef {
  status: string;
  title: string;
}

interface KanbanColumnsProps<T extends KanbanItem> {
  columns: KanbanColumnDef[];
  items: T[];
  onMove: (id: string, newStatus: string) => void;
  renderCard: (item: T) => ReactNode;
  ariaLabel?: string;
  emptyLabel?: string;
}

/**
 * Tablero con columnas y arrastre.
 *
 * Un único DndContext con una zona de soltado por columna: así una columna
 * vacía también acepta tarjetas, que es justo el caso de "todavía no hay nada
 * resuelto" y el que antes no funcionaba.
 */
export function KanbanColumns<T extends KanbanItem>({
  columns,
  items,
  onMove,
  renderCard,
  ariaLabel = 'Tablero',
  emptyLabel = 'Soltar aquí',
}: KanbanColumnsProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const target = resolveDropTarget(
      String(active.id),
      over ? { id: String(over.id), columnStatus: (over.data.current?.columnStatus as string | null) ?? null } : null,
      items,
    );
    if (target) onMove(String(active.id), target);
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4" role="list" aria-label={ariaLabel}>
        {columns.map((column) => (
          <KanbanColumnView
            key={column.status}
            column={column}
            items={items.filter((item) => item.status === column.status)}
            renderCard={renderCard}
            emptyLabel={emptyLabel}
          />
        ))}
      </div>
    </DndContext>
  );
}

function KanbanColumnView<T extends KanbanItem>({
  column,
  items,
  renderCard,
  emptyLabel,
}: {
  column: KanbanColumnDef;
  items: T[];
  renderCard: (item: T) => ReactNode;
  emptyLabel: string;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${COLUMN_ID_PREFIX}${column.status}`,
    data: { columnStatus: column.status },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[220px] w-[240px] shrink-0 flex-col rounded-xl border-2 p-3 transition ${
        isOver ? 'border-kavana-orange/60 bg-kavana-orange/5' : 'border-kavana-steel/20 bg-kavana-dark/50'
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-kavana-steel">{column.title}</h3>
        <span className="rounded-full bg-kavana-orange/20 px-2 py-0.5 text-xs font-bold text-kavana-orange">
          {items.length}
        </span>
      </div>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2" aria-label={column.title}>
          {items.length === 0 && (
            <div className="flex h-16 items-center justify-center rounded-lg border-2 border-dashed border-kavana-steel/30">
              <p className="text-xs text-slate-500">{emptyLabel}</p>
            </div>
          )}
          {items.map((item) => (
            <SortableKanbanCard key={item.id} id={item.id} status={item.status}>
              {renderCard(item)}
            </SortableKanbanCard>
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableKanbanCard({ id, status, children }: { id: string; status: string; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    data: { columnStatus: status },
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      {...attributes}
      {...listeners}
      className="cursor-grab rounded-xl border-2 border-kavana-steel/20 bg-kavana-surface p-3 active:cursor-grabbing"
      role="listitem"
      aria-grabbed={isDragging}
    >
      {children}
    </div>
  );
}
