# Plan de implementación KAVANA MANUFACTURING

## Fase 1 - Base técnica

- [x] Monorepo con workspaces.
- [x] Backend Express modular.
- [x] Frontend React + Vite + TailwindCSS.
- [x] Layouts por rol.
- [x] Logger y errores estructurados.
- [x] Rutas API por dominio.

## Fase 2 - Dominios core

1. Tenant
   - Modelo.
   - Servicio.
   - Rutas.
   - Permisos.
2. Usuario y autenticación
   - Login.
   - JWT.
   - Sesiones.
   - Revocación.
3. Catálogo
   - Materiales.
   - Modelos de fabricación.
   - Productos.
   - BOM.
4. Inventario
   - Recepción de lote.
   - FIFO.
   - Stock por ubicación.
5. Producción
   - Creación de orden.
   - Registro incremental.
   - Trazabilidad.
6. Calidad
   - Planes de inspección.
   - Registros.
   - Evidencias.
7. Mantenimiento
   - Contadores.
   - Mantenimiento preventivo.
8. Analítica
   - KPIs.
   - OEE.
   - Costes.
9. IA
   - Snapshot de fábrica.
   - Asistente contextual.

## Fase 3 - Migración desde V2

- [ ] Copiar reglas de negocio de `OrderService`.
- [ ] Copiar reglas de inventario de `InventoryService`.
- [ ] Copiar UX de `MaterialScanner`.
- [ ] Copiar lógica de `CoilCalculator`.
- [ ] Copiar decisiones estratégicas de `_KAVANA_SYSTEMS_DOCS`.

## Fase 4 - Hardening

- [ ] Tests unitarios.
- [ ] Tests de integración.
- [ ] Tests E2E.
- [ ] Auditoría de seguridad.
- [ ] Observabilidad.
- [ ] Migraciones versionadas.
