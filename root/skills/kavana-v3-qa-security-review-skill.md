# Skill: Kavana Manufacturing - QA, Seguridad y Revisión de Data Bleeding

## Propósito

Usa esta skill para revisar código, migraciones, endpoints, queries, tests y cambios de arquitectura en busca de fugas de datos, errores de tenant, incumplimientos de RLS, vulnerabilidades de concurrencia y fallos offline.

## Fuentes maestras

- [`01_MASTER_INFRA_PostgreSQL_MultiTenancy_y_RLS.md`](root/01_MASTER_INFRA_PostgreSQL_MultiTenancy_y_RLS.md)
- [`02_MASTER_BACKEND_Jwt_PgBouncer_Aislamiento.md`](root/02_MASTER_BACKEND_Jwt_PgBouncer_Aislamiento.md)
- [`04_MASTER_AUTENTICACION_Roles_y_Permisos.md`](root/04_MASTER_AUTENTICACION_Roles_y_Permisos.md)
- [`05_MASTER_CORE_Modelos_De_Datos_Produccion.md`](root/05_MASTER_CORE_Modelos_De_Datos_Produccion.md)
- [`06_MASTER_FRONTEND_OfflineFirst_HMI_Operario.md`](root/06_MASTER_FRONTEND_OfflineFirst_HMI_Operario.md)

## Riesgos críticos a detectar

1. **Data Bleeding**
   - Query sin `tenant_id`.
   - `WHERE id = ?` sin `tenant_id`.
   - Índice único global.
   - FK simple entre entidades multi-tenant.
   - Tabla sin RLS.
   - RLS activado pero sin `FORCE ROW LEVEL SECURITY`.
   - `SET SESSION` en PgBouncer Transaction Pooling.
   - `AsyncLocalStorage.enterWith()`.
   - Tenant extraído desde request body/query/header no firmado.

2. **Enumeración transversal**
   - Errores que revelan si un recurso existe en otro tenant.
   - Diferenciar 403 de 404 según pertenencia.
   - Mensajes que exponen IDs o emails de otros tenants.

3. **Concurrencia**
   - Falta de transacción en cambios de estado.
   - Doble clic no bloqueado.
   - Eventos offline duplicables.
   - Cola no FIFO.
   - Falta de idempotencia.

4. **Offline-First**
   - Estado crítico solo en memoria.
   - Eventos no persistidos antes de red.
   - API sin timeout.
   - Llamadas sin `AbortController`.

5. **Feature flags**
   - Módulo renderizado sin validar `feature_matrix`.
   - Backend sin guard de feature.
   - Caché sin invalidación.
   - Límites de cuotas no validados.

6. **Dual Theme**
   - Theme toggle no pierde estado de negocio.
   - Zustand store compartido entre temas.
   - Persistencia en localStorage correcta.

## Pruebas recomendadas

1. **Fuga transversal**
   - Usuario tenant A intenta leer recurso tenant B.
   - Resultado esperado: 404 o vacío.

2. **Inserción cruzada**
   - Tenant A intenta insertar con `tenant_id` de tenant B.
   - Resultado esperado: rechazo por RLS o validación.

3. **Contexto ausente**
   - Ejecutar query sin `app.current_tenant_id`.
   - Resultado esperado: cero filas.

4. **PgBouncer**
   - Simular dos transacciones consecutivas en misma conexión.
   - Verificar que `SET LOCAL` no contamina la siguiente transacción.

5. **Offline**
   - Ejecutar evento sin red.
   - Verificar persistencia en IndexedDB.
   - Reconectar y verificar FIFO/idempotencia.

## Checklist de auditoría

- [ ] No hay queries sin tenant.
- [ ] No hay índices únicos globales.
- [ ] No hay FK simples entre entidades multi-tenant.
- [ ] RLS activado y forzado.
- [ ] No hay `SET SESSION`.
- [ ] No hay `enterWith()`.
- [ ] Tenant viene de JWT verificado.
- [ ] Errores no enumeran datos.
- [ ] Offline persiste en IndexedDB.
- [ ] API usa AbortController 4s.
- [ ] Feature flags validados.
- [ ] **Documentation Loop:** Cada cambio de código tiene documentación asociada.

## Documentation Loop (OBLIGATORIO)

**Regla:** Un cambio sin documentación es un cambio incompleto.

Después de cada cambio de código que pase tests, verificar/actualizar documentación:
1. `docs/roadmap.md` — Estado de fase y conteo de tests.
2. `docs/decisions-log.md` — Si hubo decisión técnica.
3. `docs/technical/XX_<doc-afectado>.md` — Documento técnico afectado.
4. `docs/audit/changelog.md` — Si es funcionalidad nueva.
5. `docs/commercial/*.md` — Si afecta valor de negocio.

## Resultado esperado

Revisión estricta orientada a prevenir Data Bleeding, corrupción de estados, duplicidad de eventos y brechas de seguridad multi-tenant.
