import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatNumber } from '../utils/formatNumber.js';

interface Order {
  id: string;
  code?: string;
  model_name: string | null;
  workstation_name: string | null;
  workstation_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  quantity: number;
  produced_quantity: number;
  defect_quantity: number;
}

interface KanbanColumnProps {
  id: string;
  title: string;
  orders: Order[];
  status: 'pending' | 'in_progress' | 'completed';
  onDragEnd: (orderId: string, newStatus: string) => void;
}

function KanbanColumn({ id, title, orders, status, onDragEnd }: KanbanColumnProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      // Si es dentro de la misma columna, no cambia status
      if (over.data.current?.droppableId === id) return;
      onDragEnd(active.id as string, status);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={orders.map((o) => o.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 min-w-[220px] rounded-xl border-2 border-kavana-steel/20 bg-kavana-dark/50 p-3 flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-kavana-steel">{title}</h3>
            <span className="rounded-full bg-kavana-orange/20 px-2 py-0.5 text-xs font-bold text-kavana-orange">
              {orders.length}
            </span>
          </div>
          <div className="flex-1 min-h-[200px] space-y-2" role="list" aria-label={title}>
            {orders.length === 0 && (
              <div className="h-16 rounded-lg border-2 border-dashed border-kavana-steel/30 flex items-center justify-center">
                <p className="text-xs text-slate-500">Soltar aquí</p>
              </div>
            )}
            {orders.map((order) => (
              <SortableOrderCard key={order.id} order={order} />
            ))}
          </div>
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableOrderCard({ order }: { order: Order }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: order.id, data: { droppableId: order.status } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-300 ring-yellow-500/40',
    in_progress: 'bg-blue-500/20 text-blue-300 ring-blue-500/40',
    completed: 'bg-green-500/20 text-green-300 ring-green-500/40',
    cancelled: 'bg-slate-500/20 text-slate-300 ring-slate-500/40',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    in_progress: 'En Progreso',
    completed: 'Completada',
    cancelled: 'Cancelada',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="rounded-xl border-2 bg-kavana-surface p-4 transition cursor-grab active:cursor-grabbing"
      role="listitem"
      aria-grabbed={isDragging}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${statusColors[order.status]}`}
          >
            {statusLabels[order.status]}
          </span>
          <span className="text-lg font-bold text-white">{order.code || '—'}</span>
        </div>
        <span
          className="text-slate-400 text-xs"
          {...attributes}
          {...listeners}
        >
          ≡
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-sm text-slate-300">
        <span>{order.workstation_name || order.workstation_id}</span>
        <span>·</span>
        <span>{formatNumber(order.quantity)} uds.</span>
        <span className="text-slate-500">{order.model_name}</span>
      </div>
    </div>
  );
}

interface KanbanBoardProps {
  orders: Order[];
  changeOrderStatus: (orderId: string, targetStatus: string) => void;
  loadOrders: () => void;
}

export function KanbanBoard({ orders, changeOrderStatus, loadOrders }: KanbanBoardProps) {
  const columns = [
    { id: 'col-pending', title: 'Pendiente', status: 'pending' as const },
    { id: 'col-in_progress', title: 'En Progreso', status: 'in_progress' as const },
    { id: 'col-completed', title: 'Completada', status: 'completed' as const },
  ];

  const filtered = columns.map((col) => ({
    ...col,
    orders: orders.filter((o) => o.status === col.status),
  }));

  const handleDragEnd = (orderId: string, newStatus: string) => {
    changeOrderStatus(orderId, newStatus);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 overflow-x-auto pb-4">
        {filtered.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            orders={col.orders}
            status={col.status}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>
    </div>
  );
}