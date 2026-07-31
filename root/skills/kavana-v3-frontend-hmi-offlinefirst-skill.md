# Skill: Kavana Manufacturing - Frontend HMI Offline-First

## Propósito

Usa esta skill para diseñar, revisar o corregir interfaces de operario, Zustand stores, Dexie.js, IndexedDB, colas FIFO offline, sincronización y llamadas API resilientes. Incluye soporte para sistema de temas dual (Clásico ERP + Moderno Kavana).

## Fuente maestra

- [`06_MASTER_FRONTEND_OfflineFirst_HMI_Operario.md`](root/06_MASTER_FRONTEND_OfflineFirst_HMI_Operario.md)

## Reglas críticas

1. **UX industrial**
   - Visión de túnel: una acción principal por pantalla.
   - Flujos de 1-2 clics.
   - Evitar menús anidados.
   - Botones táctiles mínimos de 64px.
   - Inmunidad al doble clic mediante bloqueo `loading`.

2. **Dual Theme**
   - Crear variante moderna en `NombrePanel.tsx`.
   - Crear variante clásica en `ClassicNombrePanel.tsx`.
   - Ambas variantes usan el mismo Zustand store.
   - Routing en `App.tsx` selecciona variante según `localStorage.getItem('kavana_theme')`.
   - Theme toggle flotante bottom-right para cambio en tiempo real.

3. **Estado local**
   - Usar Zustand para estado de UI.
   - Persistir eventos críticos en IndexedDB/Dexie.js.
   - No depender de memoria volátil para eventos de planta.
   - Guardar evento local antes de llamar a API.

4. **Cola FIFO**
   - Cada evento debe tener ID de cliente.
   - Ordenar sincronización por `registered_at`.
   - Sincronizar en orden FIFO.
   - Usar backoff ante fallos.
   - Mover conflictos 400 a dead-letter storage sin bloquear toda la cola.

5. **API resiliente**
   - Toda llamada debe usar `AbortController`.
   - Timeout obligatorio: 4 segundos.
   - Manejar offline, timeout, 409, 400 y errores de red.
   - No bloquear la UI del operario por latencia de red.

6. **Idempotencia**
   - El backend debe aceptar ID de cliente para evitar duplicados.
   - Reintentos de red no deben duplicar logs.
   - `registered_at` del dispositivo es la verdad temporal del evento.

7. **HMI táctil**
   - Teclado numérico embebido para cantidades.
   - No invocar teclado nativo para acciones críticas.
   - Inputs y botones mínimos de 64px.
   - Estados visuales claros: pendiente, en marcha, pausado, terminado, offline, sincronizando.

## Ejemplo de llamada API con AbortController

```ts
async function callApiWithTimeout<T>(url: string, options: RequestInit, timeoutMs = 4000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}
```

## Checklist de revisión frontend

- [ ] Botones mínimos 64px.
- [ ] Visión de túnel.
- [ ] No hay menús anidados en HMI.
- [ ] Estado crítico persiste en IndexedDB/Dexie.js.
- [ ] Cola FIFO por `registered_at`.
- [ ] ID de cliente para idempotencia.
- [ ] API usa `AbortController` 4s.
- [ ] Offline no bloquea al operario.
- [ ] Reintentos con backoff.
- [ ] Conflictos derivados a dead-letter.
- [ ] **Dual Theme:** Variante moderna + clásica para cada panel.
- [ ] **Documentation Loop:** Cada cambio de código tiene documentación asociada.

## Documentation Loop (OBLIGATORIO)

**Regla:** Un cambio sin documentación es un cambio incompleto.

Después de cada cambio de código que pase tests, actualizar documentación:
1. `docs/roadmap.md` — Estado de fase y conteo de tests.
2. `docs/decisions-log.md` — Si hubo decisión técnica.
3. `docs/technical/XX_<doc-afectado>.md` — Documento técnico afectado.
4. `docs/audit/changelog.md` — Si es funcionalidad nueva.
5. `docs/commercial/*.md` — Si afecta valor de negocio.

## Resultado esperado

HMI industrial táctil, inmediata, resiliente offline y sincronizable sin duplicar eventos.
