# Kavana Manufacturing - Lecciones de la extracción V2 / Junio 2026

## Estado del documento

- **Estado:** Auditoría de referencia actualizada con sistema de temas dual, guías de usuario, y OEE como módulo opcional, unificación completada, type casting hardening, Graphify integrado.
- **Última actualización:** 2026-07-07.
- **Fuente analizada:** [`KAVANA MANUFACTURING JUNIO 2026/`](KAVANA%20V3%20JUNIO%202026/README.md:1).

## Conclusión ejecutiva

La carpeta `KAVANA MANUFACTURING JUNIO 2026` **sí sirve como referencia**, pero no debe usarse como plano de implementación directo.

Su valor principal está en la **inteligencia de negocio heredada de V2**: trazabilidad, inventario FIFO, costes, modelos de fabricación, UX industrial y decisiones estratégicas.

Su riesgo principal es repetir el fallo anterior: construir demasiado completo demasiado pronto, con demasiados dominios, demasiadas rutas, demasiados componentes y demasiada ambición antes de cerrar un MVP vertical.

## Lecciones aprendidas en V3

### Dual Theme: Respetar la diversidad de usuarios

**Lección:** No asumir que todos los usuarios quieren la misma experiencia visual.

**Evidencia:** Supervisores veteranos prefieren estilo ERP clásico (tablas, fondos claros). Operarios jóvenes prefieren estilo moderno (tarjetas, fondos oscuros).

**Solución:** Sistema de temas dual con toggle flotante y persistencia en localStorage.

**Impacto:** Adopción más rápida, menor resistencia al cambio.

### YAGNI aplicado a UI

**Lección:** No implementar funcionalidad UI hasta que sea necesaria.

**Evidencia:** Empezamos con CRUD simple (create/list/update/delete) para supervisor. Workflow complejo (aprobaciones, notificaciones) se implementará cuando el cliente lo solicite.

**Solución:** Dual theme no duplica lógica de negocio — solo duplica componentes visuales. El Zustand store es compartido.

**Impacto:** Mantenimiento: 2x componentes, pero共享 lógica de negocio.

## Referencias útiles de la extracción anterior

Documentos que sí conviene mantener como referencia:

- [`KAVANA MANUFACTURING JUNIO 2026/AUDITORIA_TECNICA_SENIOR_KAVANA_V3.md`](KAVANA%20V3%20JUNIO%202026/AUDITORIA_TECNICA_SENIOR_KAVANA_V3.md:1)
- [`KAVANA MANUFACTURING JUNIO 2026/DOMAIN_KNOWLEDGE_MAP.md`](KAVANA%20V3%20JUNIO%202026/DOMAIN_KNOWLEDGE_MAP.md:1)
- [`KAVANA MANUFACTURING JUNIO 2026/REUSABLE_ASSETS.md`](KAVANA%20V3%20JUNIO%202026/REUSABLE_ASSETS.md:1)
- [`KAVANA MANUFACTURING JUNIO 2026/MIGRATION_PLAYBOOK.md`](KAVANA%20V3%20JUNIO%202026/MIGRATION_PLAYBOOK.md:1)
- [`KAVANA MANUFACTURING JUNIO 2026/IMPLEMENTATION_PLAN.md`](KAVANA%20V3%20JUNIO%202026/IMPLEMENTATION_PLAN.md:1)

## Activos que sí deben rescatarse como conocimiento

| Activo | Uso en V3 |
|---|---|
| Trazabilidad append-only | Base para logs de producción y auditoría. |
| Inventario FIFO | Módulo futuro, no parte del MVP inicial. |
| Modelos de fabricación | Catálogo técnico futuro. |
| Costes reales | Módulo premium posterior. |
| UX industrial de operario | Inspiración para HMI táctil. |
| Escáner de bobinas | Componente futuro si el sector lo requiere. |
| Calculadora de fin de bobina | Utilidad futura, no core inicial. |
| Decisiones estratégicas | Referencia de producto, no backlog inmediato. |

## Errores detectados en la versión anterior

### 1. Demasiados dominios desde el inicio

La extracción anterior contemplaba demasiados dominios al mismo tiempo:

- Tenant.
- Auth.
- Catálogo.
- Órdenes.
- Producción.
- Inventario.
- Calidad.
- Mantenimiento.
- Analítica.
- IA.
- Exportaciones.
- Importaciones.
- Notificaciones.

**Lección V3:** el primer objetivo no es cubrir todos los dominios, sino cerrar un flujo vertical seguro y demostrable.

### 2. Demasiada implementación frontend antes de seguridad

La versión anterior ya tenía:

- Login placeholder.
- Layouts por rol.
- Rutas por dashboard.
- Cliente Axios.
- Contextos.

Pero no cerraba los fundamentos de multi-tenancy, RLS, PostgreSQL y aislamiento.

**Lección V3:** antes de construir paneles por rol, hay que blindar datos y transacciones.

### 3. Riesgo de copiar deuda técnica

La auditoría anterior recomendaba rescatar muchos componentes y servicios de V2. Eso es útil como conocimiento, pero peligroso si se copia código completo.

**Lección V3:** rescatar reglas, contratos y UX; no copiar monolitos.

### 4. MVP demasiado amplio

El plan anterior intentaba avanzar simultáneamente en:

- Backend modular.
- Frontend por roles.
- Migración desde V2.
- Inventario FIFO.
- Producción.
- Calidad.
- Mantenimiento.
- KPIs.
- OEE.
- IA.

**Lección V3:** el MVP inicial debe ser mínimo: tenant, usuario, puesto, orden, evento de producción y HMI offline.

### 5. Stack anterior no alineado con la arquitectura Kavana Manufacturing actual

La extracción anterior usaba principalmente:

- Express.
- MongoDB.
- Socket.io.
- React/Vite.

La arquitectura actual exige:

- PostgreSQL 18.
- RLS.
- `tenant_id` obligatorio.
- PgBouncer Transaction Pooling.
- `SET LOCAL`.
- NestJS/Node.
- Feature flags JSONB.
- Offline-first con IndexedDB/Dexie.js.

**Lección V3:** no migrar decisiones técnicas antiguas si contradicen las reglas actuales.

## Nueva regla de migración V2 a V3

Toda referencia de V2 debe seguir este proceso:

1. Leer el activo V2.
2. Extraer la regla de negocio.
3. Convertir la regla en test.
4. Definir contrato V3.
5. Reimplementar en V3.
6. Validar contra la regla original.
7. Documentar la decisión.

No se copiarán servicios, componentes o scripts completos salvo utilidad pura.

## MVP vertical recomendado

El primer flujo demostrable debe ser:

1. Crear tenant.
2. Crear usuario supervisor.
3. Crear usuario operario.
4. Crear puesto de trabajo.
5. Crear orden de producción.
6. Operario inicia orden.
7. Operario pausa orden.
8. Operario finaliza orden.
9. Cada acción genera un log de tiempo.
10. El HMI offline persiste eventos en IndexedDB.
11. La sincronización respeta FIFO.
12. RLS impide fuga entre tenants.

## Qué no se implementará en el MVP inicial

- Inventario FIFO.
- Escáner de bobinas.
- Calculadora de fin de bobina.
- Calidad avanzada.
- Mantenimiento.
- OEE avanzado.
- Costes.
- IA contextual.
- Exportaciones.
- Importaciones.
- Dashboards de gerencia.
- Landing comercial compleja.

Estos elementos pueden documentarse, pero no implementarse hasta que el core vertical esté cerrado.

## Principio anti-sobreingeniería

Cada nueva funcionalidad debe responder a una de estas preguntas:

1. ¿Es necesaria para iniciar, pausar o finalizar una orden?
2. ¿Es necesaria para aislar datos por tenant?
3. ¿Es necesaria para persistir offline?
4. ¿Es necesaria para validar seguridad?
5. ¿Es necesaria para demostrar el producto?

Si la respuesta es no, se documenta como futuro y no se implementa todavía.

## Conclusión

La carpeta anterior es valiosa como **biblioteca de conocimiento**, no como **base de implementación**.

La estrategia correcta es:

- Mantener la visión industrial.
- Rescatar reglas de negocio.
- Conservar UX de planta.
- Reescribir arquitectura.
- Reducir alcance inicial.
- Construir un MVP vertical antes de ampliar dominios.
