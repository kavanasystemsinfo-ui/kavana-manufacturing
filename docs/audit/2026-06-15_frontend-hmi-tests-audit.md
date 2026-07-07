# Kavana V3 - Auditoría 2026-06-15: Fase 4 y tests iniciales

## Estado del documento

- **Última actualización:** 2026-07-04. Documentación actualizada con Fase 5.5.

## Alcance

Auditoría técnica y documental de la implementación de la Fase 4: HMI táctil offline-first, sincronización backend de eventos offline y tests iniciales.

## Hallazgos positivos

| Hallazgo | Impacto | Evidencia |
|---|---|---|
| Frontend HMI mínimo construido sin overengineering | Alto | [`frontend/src/App.tsx`](frontend/src/App.tsx:1) |
| API calls respetan timeout de 4s | Crítico | [`frontend/src/api/client.ts`](frontend/src/api/client.ts:1) |
| Eventos offline se persisten antes de red | Crítico | [`frontend/src/db/local-db.ts`](frontend/src/db/local-db.ts:20) |
| Sincronización FIFO implementada | Alto | [`frontend/src/store/hmi-store.ts`](frontend/src/store/hmi-store.ts:99) |
| Fallos pasan a dead-letter | Alto | [`frontend/src/store/hmi-store.ts`](frontend/src/store/hmi-store.ts:112) |
| Backend valida tenant del evento offline | Crítico | [`backend/src/core-mes-production/core-mes-production.service.ts`](backend/src/core-mes-production/core-mes-production.service.ts:126) |
| Idempotencia por `client_event_id` | Crítico | [`backend/src/core-mes-production/core-mes-production.service.ts`](backend/src/core-mes-production/core-mes-production.service.ts:216) |
| Tests unitarios de transiciones y DTO | Alto | [`backend/src/core-mes-production/state-machine.spec.ts`](backend/src/core-mes-production/state-machine.spec.ts:1), [`backend/src/core-mes-production/dto.spec.ts`](backend/src/core-mes-production/dto.spec.ts:1) |
| Test IndexedDB FIFO/dead-letter | Alto | [`frontend/src/db/local-db.spec.ts`](frontend/src/db/local-db.spec.ts:1) |

## Riesgos de seguridad

| Riesgo | Severidad | Decisión |
|---|---:|---|
| El HMI usa constantes demo | Alta | Aceptado temporalmente para Fase 4 mínima; debe reemplazarse en Fase 5/6 |
| Falta JWT real en la demo | Crítica | No bloquea HMI offline, pero bloquea producción SaaS |
| Falta ejecución RLS contra PostgreSQL real | Crítica | Se añadió smoke test manual, pendiente de ejecución |
| Eventos offline pueden divergir del estado servidor tras recarga | Media | Mitigado parcialmente por backend state validation |

## Riesgos de arquitectura

| Riesgo | Severidad | Decisión |
|---|---:|---|
| Implementar demasiadas pantallas antes de autenticación | Alta | Evitado: solo HMI mínimo |
| Duplicar lógica de estado entre frontend y backend | Media | Frontend es optimista; backend mantiene autoridad |
| Cola offline bloqueada por evento inválido | Media | Mitigada con dead-letter |
| Falta Service Worker/PWA shell | Media | Pendiente para hardening offline |

## Validaciones ejecutadas

```bash
npm test
npm run build --workspace backend
npm run build --workspace frontend
```

Resultado: todas las validaciones pasaron.

## Recomendación de siguiente fase

Avanzar a Fase 5 solo con una condición: no construir administración compleja antes de resolver autenticación mínima y selección real de contexto. La siguiente implementación debe ser deliberadamente pequeña:

1. JWT demo real o fixture controlado.
2. Endpoint administrativo mínimo para crear orden/puesto.
3. Selección de orden/puesto en HMI.
4. Ejecución del smoke test RLS contra PostgreSQL.
