# CHANGELOG AI — Sesión Noche 1: Auditoría y cimentación

## fix(frontend): añadir campos faltantes al mock de OfflineWorkBlock

- **Motivo:** El tipo `OfflineWorkBlock` requiere `version` y `device_id`, pero el test helper no los incluía, causando TS2739 que rompía `npm run build`.
- **Archivos:** `frontend/src/db/local-db.spec.ts`
- **Beneficios:** Build completo vuelve a funcionar (`npm run build` → OK)
- **Riesgos:** Ninguno — solo se añadieron campos obligatorios al mock

## docs: AUDIT_INICIAL.md creada

- **Motivo:** Establecer métricas base del proyecto antes de cualquier cambio
- **Archivos:** `sessions/noche-01-auditoria/AUDIT_INICIAL.md`
- **Contenido:** Tests, build, lint, deuda técnica, seguridad, issues priorizados

## Estado del proyecto

| Métrica | Estado |
|---------|--------|
| ✅ Tests backend | 208/208 pasando (27 files) |
| ✅ Build | OK (backend + frontend) |
| ❌ Lint | ESLint no funcional (config issue) |
| ⚠️ Frontend tests | Solo 4 spec files para 7912 líneas |
| 🔴 Issue #1 build | ✅ RESUELTO |
| 🟡 Issue #2 ESLint | PENDIENTE |
