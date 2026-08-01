# AI Agent Context — KAVANA Systems V3

Este archivo existe para que agentes de código como Cursor, Codex u otros puedan entender rápidamente qué información de KAVANA Systems V2 es útil y cómo debe usarse al construir V3 desde cero.

## Objetivo

KAVANA V3 no debe copiar ciegamente V2. Debe usar V2 como base de conocimiento validada.

Regla principal:

> Antes de inventar una regla de negocio nueva, consulta la documentación de V2 y reutiliza solo aquello que ya esté validado.

## Lectura obligatoria antes de implementar
 
1. [`README.md`](README.md)
2. [`AUDITORIA_TECNICA_SENIOR_KAVANA_V3.md`](AUDITORIA_TECNICA_SENIOR_KAVANA_V3.md)
3. [`DOMAIN_KNOWLEDGE_MAP.md`](DOMAIN_KNOWLEDGE_MAP.md)
4. [`REUSABLE_ASSETS.md`](REUSABLE_ASSETS.md)
5. [`MIGRATION_PLAYBOOK.md`](MIGRATION_PLAYBOOK.md)
6. [`knowledge/CONTEXT_SOURCES.md`](knowledge/CONTEXT_SOURCES.md)
7. [`knowledge/NOTEBOOK_CONTEXT_INDEX.md`](knowledge/NOTEBOOK_CONTEXT_INDEX.md), si la tarea usa documentos NotebookLM

## Principios de decisión

### Rescatar casi intacto

- Inventario FIFO y lotes.
- Escáner de bobinas.
- Calculadora de fin de bobina.
- Modelos de fabricación.
- Trazabilidad ISO.
- Costes en tiempo real.
- UX industrial de operario.
- IA contextual.
- KPIs/OEE.

### Rescatar con refactor

- `OrderService` de V2.
- `InventoryService` de V2.
- `SupervisorDashboard` de V2.
- `DataImportWizard` de V2.
- `ThemeEditor` de V2.
- Servicios de exportación.

### No copiar

- Backend monolítico tal cual.
- Frontend legacy duplicado.
- Scripts de reparación sin convertir en migraciones.
- `console.log` de producción.
- Hardcodeo de URLs cloud.
- Rutas sin tests.
- Componentes UI con deuda visual alta.

## Flujo recomendado para agentes de código

Antes de crear una feature:

1. Identifica el dominio: producción, inventario, calidad, mantenimiento, catálogo, costes, IA, etc.
2. Busca en [`REUSABLE_ASSETS.md`](REUSABLE_ASSETS.md) si existe algo equivalente en V2.
3. Consulta la auditoría para ver si ese activo se debe rescatar, refactorizar o descartar.
4. Implementa en V3 siguiendo la arquitectura modular.
5. Añade tests si la regla afecta costes, inventario, trazabilidad o permisos.

## Convenciones V3
 
- Backend modular por dominios.
- Eventos append-only para producción, consumo, calidad, mantenimiento e incidencias.
- Multi-tenant nativo.
- Inventario FIFO.
- Trazabilidad inmutable.
- Logging estructurado.
- Contratos de API explícitos.
- Frontend industrial con navegación por rol.
+
+## Configuración obligatoria de IA
+
+Para que Cursor, Codex u otro agente consulte siempre esta información, mantener activas las reglas:
+
+- [`.cursor/rules/00-kavana-global-context.mdc`](.cursor/rules/00-kavana-global-context.mdc)
+- [`.cursor/rules/01-kavana-critical-domains.mdc`](.cursor/rules/01-kavana-critical-domains.mdc)
+- [`.cursor/rules/02-kavana-migration-v2.mdc`](.cursor/rules/02-kavana-migration-v2.mdc)
+
+La regla global debe tener `alwaysApply: true`.

## Pregunta crítica antes de codificar

Si la tarea implica una de estas áreas, no improvises:

- Coste real.
- Consumo de material.
- FIFO.
- Lotes.
- Bobinas.
- Scrap.
- Merma.
- Cascada de producción.
- Trazabilidad.
- Calidad.
- OEE.
- Mantenimiento preventivo.
- Permisos por rol.

Consulta primero [`DOMAIN_KNOWLEDGE_MAP.md`](DOMAIN_KNOWLEDGE_MAP.md).
