# 🤖 AI-Assisted Evolution — Kavana Manufacturing v3

> Documentación del proceso de mejora continua asistido por IA.
> Cada sesión documenta: objetivo, cambios, métricas, decisiones.

## Estructura

```
docs/ai/
├── README.md              ← Este archivo (índice)
├── CASE_STUDY.md          ← Caso de estudio completo (cuando esté listo)
├── AZURE_DEPLOY.md         ← Guía de migración a Azure
└── sessions/               ← Output de cada noche de trabajo
    ├── noche-01-auditoria/
    ├── noche-02-backend/
    └── ...
```

## Sesiones realizadas

| # | Sesión | Foco | Cambios | Tests |
|---|--------|------|---------|-------|
| 1 | Auditoría inicial | Build, métricas base, bugs críticos | +1 fix (TS2739) | 208 → 208 |
| 2 | Backend refactor | `any`s → tipos, Zod, tests módulos sin cobertura | +5 tests, 4 archivos | 208 → 213 |
| 3 | Frontend | Tests store, tipado, Dockerfiles | +5 tests, Dockerfiles backend/frontend | 213 → 235 ✅ |

## Próximas sesiones planificadas

- [ ] 5 — Docker local: docker-compose funcional con backend + frontend + BD + Redis
- [ ] 6 — AI Advisor: caché, tests integración, optimización de costes
- [ ] 7 — Documentación y caso de estudio final (CASE_STUDY.md)

## Documentación de referencia

- `reference/AZURE_DEPLOY.md` — Guía de cómo desplegar en Azure (cuando haya presupuesto)

## Estado actual del proyecto

| Métrica | Valor |
|---------|-------|
| Tests backend | 213 (29 files) |
| Tests frontend | 22 (5 files) |
| **Total tests** | **235** ✅ |
| Build | ✅ |
| Dockerfiles | backend + frontend (multi-stage) |
| Módulos sin tests | 2 (db, queue — requieren integración) |
