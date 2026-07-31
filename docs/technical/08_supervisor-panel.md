# Kavana Manufacturing - Panel de Supervisor

## Estado del documento

- **Estado:** Implementación completada con sistema de temas dual, barras de progreso, activity feed, workstation board Andon, polling 10s, y guía de usuario integrada (`SUPERVISOR_HELP`). Paridad completa moderno/clásico.
- **Última actualización:** 2026-07-07.
- **Fuente maestra:** `root/06_MASTER_FRONTEND_OfflineFirst_HMI_Operario.md`.

## Objetivo

Definir y documentar la arquitectura del panel de supervisor: gestión de órdenes de producción, visualización de estado de workstations, y CRUD de producción con soporte multi-tenant.

## Alcance del Supervisor

### Funcionalidades Implementadas

1. **Gestión de Órdenes de Producción**
   - Crear órdenes con modelo, workstation, cantidad objetivo, operario asignado
   - Listar órdenes con filtros por estado
   - Actualizar estado de órdenes (pendiente → en_progreso → completada)
   - Eliminar órdenes (soft delete con auditoría)
   - **Barras de progreso** por orden (producido/objetivo, %) con colores (azul=en progreso, verde=completado)
   - **Custom fields** del supervisor: `numero_orden`, `medida`, `material`, `notas` (escritos por supervisor, solo lectura para operario)
   - **Contador de defectos** visible cuando `defect_quantity > 0`

2. **Activity Feed (Línea de Tiempo)**
   - Tab expandible por orden mostrando bloques de trabajo
   - Badges por tipo (producción, parada, calidad)
   - Duración formateada (HH:MM:SS)
   - Nombre del operario, cantidades producidas/defectuosas
   - Razones de parada explícitas
   - Componente compartido: `ActivityFeed.tsx`

3. **Workstation Board Andon**
   - Grid visual de puestos con códigos de color:
     - 🟢 Verde = En producción
     - 🔴 Rojo = Parado / Avería
     - ⚪ Gris = Libre (sin operario asignado)
   - Muestra operario activo y última actividad
   - Componente compartido: `WorkstationBoard.tsx`
   - Endpoint: `GET /orders/workstations-status` (LATERAL JOIN para última actividad por puesto)

4. **Polling Automático (10s)**
   - `startPolling()` / `stopPolling()` en `supervisor-store.ts`
   - Refresca `orders`, `workstationStatus` cada 10 segundos
   - Limpia intervalo en `unmount` (cleanup)
   - YAGNI: No se usan WebSockets en V3 (alineado con offline-first)

5. **Integración con Feature Flags**
   - Solo muestra funcionalidades habilitadas para el tenant
   - Respeta `core_mes` como módulo obligatorio
   - Oculta módulos desactivados (OEE, Quality, Cost)

### Endpoints Backend

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/orders` | Crear orden de producción |
| GET | `/orders` | Listar órdenes del tenant (con JOINs: model_name, workstation_name, produced/defect) |
| GET | `/orders/available` | Listar órdenes asignadas a la workstation del operario |
| GET | `/orders/:id/activity` | Activity feed de una orden (bloques de trabajo + operario) |
| GET | `/orders/workstations-status` | Estado Andon de todos los puestos (LATERAL JOIN) |
| PATCH | `/orders/:id` | Actualizar orden (custom_fields, estado) |
| DELETE | `/orders/:id` | Eliminar orden (soft delete) |

### Seguridad Multi-Tenant

- Todos los queries incluyen `WHERE tenant_id = $1`
- RLS enforcement en PostgreSQL
- Token JWT con `tenant_id` en payload
- Valida que supervisor tiene permisos sobre el tenant

## Sistema de Temas Dual

### Tema Moderno (SupervisorPanel.tsx)

- **Estilo:** Kavana dark theme
- **Componentes:** Tarjetas con bordes redondeados, gradientes sutiles
- **Colores:** Fondo `kavana-dark`, paneles `kavana-panel`, acento `kavana-orange`
- **Interacción:** Toggle switches para estados, modales con blur backdrop

### Tema Clásico (ClassicSupervisorPanel.tsx)

- **Estilo:** ERP tradicional
- **Componentes:** Tarjetas con bordes definidos, tablas HTML estándar, formularios inline
- **Colores:** Fondo `bg-slate-50`, paneles `bg-white`, bordes `border-slate-200`
- **Interacción:** Botones de acción, badges de estado, selects estándar
- **Paridad con tema moderno:** Tabs (Órdenes/Puestos), barras de progreso, activity feed expandible, workstation board Andon, polling automático 10s
- **Componentes compartidos:** Reutiliza `ActivityFeed.tsx` y `WorkstationBoard.tsx` del tema moderno

### Comparativa Visual

| Elemento | Moderno | Clásico |
|----------|---------|---------|
| Contenedor principal | `rounded-[2rem] border-kavana-steel/30` | `rounded-lg border-slate-200` |
| Fondo | `bg-kavana-dark` | `bg-slate-50` |
| Tarjetas | `bg-kavana-panel/90 shadow-kavana-glow` | `bg-white shadow-sm` |
| Tabla | N/A (usa tarjetas) | `divide-y divide-slate-200` |
| Botón primario | `bg-kavana-orange text-kavana-dark` | `bg-blue-600 text-white` |
| Badge estado | `bg-emerald-500/10 text-emerald-400` | `bg-green-100 text-green-700` |

## Arquitectura de Componentes

```
SupervisorPanel.tsx (moderno)
├── ThemeSwitcher (toggle flotante)
├── Header con logo y estado
├── Toolbar con filtros
├── OrdersTable (tarjetas)
│   ├── OrderCard
│   │   ├── Estado badge
│   │   ├── Modelo info
│   │   ├── Workstation info
│   │   └── Acciones (editar/eliminar)
│   └── EmptyState
├── OrderForm (modal)
│   ├── Modelo select
│   ├── Workstation select
│   ├── Cantidad目标 input
│   └── Operario select
└── FailedEventsModal

ClassicSupervisorPanel.tsx (clásico)
├── Header con logo y breadcrumb
├── Toolbar con filtros
├── OrdersTable (tabla HTML)
│   ├── TableHead (columnas)
│   └── TableBody (filas)
│       ├── Fila con datos
│       ├── Badge estado
│       └── Acciones (editar/eliminar)
├── OrderForm (sección inline)
│   ├── Campos en grid
│   └── Botones Guardar/Cancelar
└── FailedEventsModal
```

## Store Zustand

El store compartido entre temas gestiona:

```typescript
interface SupervisorState {
  // Datos
  orders: Order[];
  workstations: Workstation[];
  manufacturingModels: ManufacturingModel[];
  
  // Estado UI
  isLoading: boolean;
  error: string | null;
  isMutating: boolean;
  
  // Filtros
  statusFilter: 'all' | 'pendiente' | 'en_produccion' | 'completada';
  
  // Acciones
  loadOrders: () => Promise<void>;
  createOrder: (data: CreateOrderDto) => Promise<void>;
  updateOrder: (id: string, data: UpdateOrderDto) => Promise<void>;
  deleteOrder: (id: string) => Promise<void>;
}
```

## Criterios de Aceptación

| Criterio | Estado | Evidencia |
|----------|--------|-----------|
| Supervisor puede crear órdenes de producción | ✅ | `POST /orders` |
| Supervisor puede listar órdenes del tenant | ✅ | `GET /orders` (con JOINs) |
| Supervisor puede actualizar estado de órdenes | ✅ | `PATCH /orders/:id` |
| Supervisor puede eliminar órdenes | ✅ | `DELETE /orders/:id` |
| Supervisor ve barras de progreso por orden | ✅ | `produced_quantity / quantity` (%) |
| Supervisor ve activity feed expandible | ✅ | `GET /orders/:id/activity` + `ActivityFeed.tsx` |
| Supervisor ve board Andon de puestos | ✅ | `GET /orders/workstations-status` + `WorkstationBoard.tsx` |
| Supervisor rellena custom fields (N.Orden, Medida, Material, Notas) | ✅ | Form de creación en ambos temas |
| Tema clásico con paridad de features | ✅ | `ClassicSupervisorPanel.tsx` con tabs, progreso, activity, Andon |
| Tema moderno funcional | ✅ | `SupervisorPanel.tsx` |
| Polling automático (10s) para refresco | ✅ | `supervisor-store.ts` `startPolling/stopPolling` |
| Toggle de temas persiste en localStorage | ✅ | `App.tsx` |
| Multi-tenant enforcement | ✅ | `WHERE tenant_id = $1` |
| Tests backend passing | ✅ | 185 tests (20 en `orders.spec.ts`) |

## Brechas Pendientes

| Área | Brecha | Severidad |
|------|--------|-----------|
| UI | Falta panel de dashboard con métricas OEE | Media |
| UI | Falta gráficos de producción en tiempo real | Media |
| API | Falta paginación en listado de órdenes | Baja |
| API | Falta exportación a CSV/Excel | Baja |
| Seguridad | Falta auditoría de cambios de estado | Baja |

## Guía de usuario integrada

El panel incluye un botón "Ayuda" (`HelpModal`) en la cabecera, junto a "+ Nueva Orden". Aplica a ambos temas (moderno y clásico).

**Contenido de `SUPERVISOR_HELP`** (en `frontend/src/help-content.ts`):

1. Presentación del panel (puente admin ↔ planta)
2. Pestaña Órdenes — explicación de columnas y barra de progreso
3. Crear orden con campos personalizados (N.Orden, Medida, Material, Notas — solo lectura para operario)
4. Pestaña Puestos — Andon, códigos de color (🟢/🔴/⚪)
5. Activity Feed — cómo expandir y qué muestra cada bloque
6. Refresco automático 10s

## Próximas Prioridades

1. Implementar dashboard de métricas OEE para supervisor
2. Añadir gráficos de tendencia de producción
3. Implementar paginación en listados
4. Añadir exportación de datos
5. Implementar auditoría de cambios de estado
