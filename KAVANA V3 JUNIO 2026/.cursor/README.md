# Configuración Cursor para KAVANA MANUFACTURING

Este proyecto incluye reglas Cursor en `.cursor/rules/` para obligar al agente a consultar la base de conocimiento antes de actuar.

## Reglas activas

- [`rules/00-kavana-global-context.mdc`](rules/00-kavana-global-context.mdc): siempre aplicada.
- [`rules/01-kavana-critical-domains.mdc`](rules/01-kavana-critical-domains.mdc): aplicada en backend/frontend.
- [`rules/02-kavana-migration-v2.mdc`](rules/02-kavana-migration-v2.mdc): aplicada cuando se migra desde V2.

## Uso recomendado

Antes de pedir una tarea al agente:

1. Abrir el proyecto `KAVANA MANUFACTURING JUNIO 2026`.
2. Pedir que consulte `AGENTS.md`, `DOMAIN_KNOWLEDGE_MAP.md`, `REUSABLE_ASSETS.md` y `MIGRATION_PLAYBOOK.md`.
3. Para tareas críticas, pedir explícitamente que siga `MIGRATION_PLAYBOOK.md`.
4. Para tareas con documentos Notebook, pedir que actualice el índice de conocimiento.
