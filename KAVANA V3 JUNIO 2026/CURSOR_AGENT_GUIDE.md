# Guía para Cursor/Codex

Este archivo está pensado para agentes IA que van a escribir código en KAVANA MANUFACTURING.

## Cómo trabajar

1. Lee primero [`AGENTS.md`](AGENTS.md).
2. Si la tarea toca negocio, lee [`DOMAIN_KNOWLEDGE_MAP.md`](DOMAIN_KNOWLEDGE_MAP.md).
3. Si la tarea requiere reutilizar V2, lee [`REUSABLE_ASSETS.md`](REUSABLE_ASSETS.md).
4. Si la tarea implica migración, sigue [`MIGRATION_PLAYBOOK.md`](MIGRATION_PLAYBOOK.md).
5. Si la tarea usa documentos NotebookLM, consulta [`knowledge/NOTEBOOK_CONTEXT_INDEX.md`](knowledge/NOTEBOOK_CONTEXT_INDEX.md) y [`knowledge/CONTEXT_SOURCES.md`](knowledge/CONTEXT_SOURCES.md).
6. Implementa en la arquitectura V3, no en la estructura V2.

## Si vas a crear un endpoint

Antes de escribir código:

- Define dominio.
- Define modelo.
- Define validaciones.
- Define permisos.
- Define eventos asociados.
- Define tests.

## Si vas a crear un componente frontend

Antes de escribir código:

- Define rol.
- Define flujo.
- Define datos.
- Define acciones.
- Define estados de error.
- Define si debe reutilizar UX de V2.

## Si vas a tocar costes, inventario o trazabilidad

No improvisar. Consultar:

- [`DOMAIN_KNOWLEDGE_MAP.md`](DOMAIN_KNOWLEDGE_MAP.md)
- [`REUSABLE_ASSETS.md`](REUSABLE_ASSETS.md)
- [`MIGRATION_PLAYBOOK.md`](MIGRATION_PLAYBOOK.md)

## Convenciones de código V3

- Funciones pequeñas.
- Servicios por dominio.
- Modelos claros.
- Eventos inmutables.
- Validaciones explícitas.
- Logging estructurado.
- Sin `console.log` en producción.
- Tests para reglas críticas.

## No hacer

- No copiar `OrderService` entero.
- No copiar frontend legacy.
- No mezclar lógica de inventario en componentes.
- No poner secretos en código.
- No hardcodear URLs.
- No crear rutas sin permisos.
- No borrar eventos de producción.

## Sí hacer

- Extraer reglas de V2.
- Convertir reglas en tests.
- Reimplementar limpio.
- Mantener UX industrial.
- Mantener trazabilidad.
- Mantener FIFO.
- Mantener costes reales.
- Mantener IA contextual separada del core.
