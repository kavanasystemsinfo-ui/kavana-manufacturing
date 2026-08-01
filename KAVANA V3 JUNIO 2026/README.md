# KAVANA Systems V3

KAVANA Systems V3 es la reescritura modular del MES industrial KAVANA Systems V2. Este proyecto nace desde cero usando como base la auditoría técnica almacenada en [`AUDITORIA_TECNICA_SENIOR_KAVANA_V3.md`](AUDITORIA_TECNICA_SENIOR_KAVANA_V3.md).

## Estado del documento

- **Última actualización:** 2026-07-04. Documentación actualizada con Fase 5.5.

## Principios
 
- Arquitectura modular por dominios de negocio.
- Backend API separado del frontend.
- Multi-tenant nativo.
- Trazabilidad append-only.
- Inventario FIFO recuperado de V2.
- UX industrial de alta legibilidad.
- Observabilidad estructurada.
- Migraciones y seeds controlados.
- Base de conocimiento reutilizable para agentes IA.
 
## Documentación para agentes IA
 
Antes de implementar cualquier funcionalidad, un agente de código debe consultar:
 
- [`AGENTS.md`](AGENTS.md): instrucciones generales para Cursor/Codex.
- [`DOMAIN_KNOWLEDGE_MAP.md`](DOMAIN_KNOWLEDGE_MAP.md): mapa de dominios y reglas de negocio.
- [`REUSABLE_ASSETS.md`](REUSABLE_ASSETS.md): índice de activos rescatables de V2.
- [`MIGRATION_PLAYBOOK.md`](MIGRATION_PLAYBOOK.md): proceso para migrar reglas validadas sin arrastrar deuda.
- [`CURSOR_AGENT_GUIDE.md`](CURSOR_AGENT_GUIDE.md): guía rápida para agentes IA.

Para configurar Cursor u otro agente, consultar:

- [`.cursor/README.md`](.cursor/README.md)
- [`.cursor/rules/00-kavana-global-context.mdc`](.cursor/rules/00-kavana-global-context.mdc)
- [`.cursor/rules/01-kavana-critical-domains.mdc`](.cursor/rules/01-kavana-critical-domains.mdc)
- [`.cursor/rules/02-kavana-migration-v2.mdc`](.cursor/rules/02-kavana-migration-v2.mdc)

Para incorporar documentos NotebookLM, usar:

- [`knowledge/README.md`](knowledge/README.md)
- [`knowledge/CONTEXT_SOURCES.md`](knowledge/CONTEXT_SOURCES.md)
- [`knowledge/NOTEBOOK_CONTEXT_INDEX.md`](knowledge/NOTEBOOK_CONTEXT_INDEX.md)

## Estructura

```text
.
├── backend/
│   ├── src/
│   │   ├── app.js
│   │   ├── server.js
│   │   ├── config/
│   │   ├── db/
│   │   ├── middlewares/
│   │   ├── modules/
│   │   └── utils/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── layouts/
│   │   ├── pages/
│   │   └── styles.css
│   └── package.json
├── knowledge/
│   ├── CONTEXT_SOURCES.md
│   ├── NOTEBOOK_CONTEXT_INDEX.md
│   ├── notebook/
│   └── technical/
└── package.json
```

## Arranque local

```bash
npm install
npm run dev
```

El backend arrancará en `http://localhost:3001` y el frontend en `http://localhost:5173`.

## Configuración

Copia los ejemplos:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

## Estado inicial

Este scaffold implementa la base del proyecto:

- Monorepo con workspaces.
- Backend Express modular.
- Frontend React + Vite + TailwindCSS.
- Rutas API preparadas para dominios.
- Layouts por rol.
- Logger y manejador de errores.
- Documentación técnica vinculada a la auditoría.
