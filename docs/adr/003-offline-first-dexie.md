# ADR-003: Offline-First con Dexie.js/IndexedDB y Sync FIFO

**Status:** Aceptada  
**Fecha:** 2025-09  
**Decisor:** Jorge Luis Parra  
**Contexto:** HMI para piso de planta — conectividad intermitente, requisito de 24/7 sin interrupciones  
**Última actualización:** 2026-07-04

---

## Contexto

**El problema crítico:** El piso de planta de manufactura tiene:
- Conectividad WiFi intermitente (máquinas generan interferencia)
- Jornadas de 12-16 horas sin posibilidad de perder datos
- **Regla del negocio:** "Un operador NUNCA puede perder su bloque de producción"

**Dato clave:** En manufacturing, un bloque de producción perdido = pérdida de trazabilidad = pérdida de certificación GMP = parada de planta.

## Opciones Evaluadas

| Opción | Latencia offline | Consistencia | Complejidad | Riesgo |
|--------|------------------|--------------|-------------|--------|
| **Polling periódico** | 30s+ | Baja | Baja | Alta |
| **WebSockets** | <1s | Media | Alta | Media |
| **IndexedDB + FIFO Sync** | 0ms | Alta | Media | Baja |
| **Service Worker + Cache API** | 0ms | Media | Alta | Media |

## Decisión

**IndexedDB (Dexie.js) + Sync FIFO + AbortController 4s**

### Arquitectura

```
┌─────────────────────────────────────────────────┐
│  HMI React (Pantalla Operador)                  │
│  ┌─────────────┐  ┌──────────────────────────┐  │
│  │ UI State    │  │ Dexie.js (IndexedDB)     │  │
│  │ (Zustand)   │◄─┤ - orders (pending)       │  │
│  │             │  │ - workBlocks (pending)    │  │
│  └─────────────┘  │ - events (failed)        │  │
│                   │ - operatorContext        │  │
│                   └──────────┬───────────────┘  │
│                              │                  │
│                   ┌──────────▼───────────────┐  │
│                   │ Sync Service (FIFO)      │  │
│                   │ - Cola ordenada por ts   │  │
│                   │ - AbortController 4s     │  │
│                   │ - Retry con backoff      │  │
│                   └──────────┬───────────────┘  │
└──────────────────────────────┼──────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  Backend NestJS      │
                    │  POST /sync/work-block│
                    │  POST /sync/events   │
                    └──────────────────────┘
```

### Implementación Dexie.js

```typescript
// src/lib/db.ts
const db = new Dexie('KavanaHMI');

db.version(1).stores({
  orders: '++id, tenantId, status, timestamp',
  workBlocks: '++id, tenantId, orderId, timestamp, synced',
  events: '++id, tenantId, type, timestamp, synced',
  failedBlocks: '++id, tenantId, error, timestamp',
  operatorContext: 'key'
});

// Sync FIFO - ordenar por timestamp
export async function syncPendingBlocks() {
  const pending = await db.workBlocks
    .where('synced')
    .equals(0)
    .sortBy('timestamp'); // FIFO

  for (const block of pending) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      await fetch('/api/sync/work-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(block),
        signal: controller.signal
      });

      clearTimeout(timeout);
      await db.workBlocks.update(block.id!, { synced: 1 });
    } catch (error) {
      // Guardar como fallido para retry posterior
      await db.failedBlocks.add({
        ...block,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }
}
```

### AbortController 4s

**Por qué 4 segundos:**
- HMI necesita respuesta en <5s para UX acceptable
- Un timeout mayor bloquea la cola de sync
- Un timeout menor causa falsos negativos en red lenta

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 4000);

try {
  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timeout);
  return response;
} catch (err) {
  if (err.name === 'AbortError') {
    // Timeout — mantener en cola para retry
    console.warn('Sync timeout, will retry');
  }
  throw err;
}
```

## Consecuencias

### Positivas
- **0ms latencia offline** — IndexedDB es local
- **FIFO garantizado** — `sortBy('timestamp')` asegura orden
- **No pérdida de datos** — Todo se almacena localmente primero
- **Recovery automático** — Retry con backoff exponencial

### Negativas
- **Complejidad** — Dexie.js tiene curva de aprendizaje
- **Storage limit** — IndexedDB tiene límites (~50% disco)
- **Conflicto de merge** — Si dos operadores editan el mismo bloque offline
- **Debugging** — Datos en IndexedDB no son fácilmente inspeccionables

### Riesgos Mitigados
- **Límite storage:** Monitoriar usage, limpiar datos synced >30 días
- **Conflictos:** Último writer gana (por ahora), audit log para追跡
- **Debugging:** DevTools extension para inspeccionar IndexedDB

---

**Relación con ADR-001:** El sync respeta tenant_id para aislamiento cross-tenant.
