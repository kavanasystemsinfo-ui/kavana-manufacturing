# AUDIT INICIAL — Kavana Manufacturing v3

> **Sesión:** Noche 1 — Auditoría y cimentación
> **Fecha:** Julio 2026
> **Proyecto:** `/root/kavana-systems-v3`

---

## 1. Métricas base

### Tests

| Métrica | Valor |
|---------|-------|
| Test files (backend) | 27 ✅ |
| Tests pasando | **208/208** ✅ |
| Test files (frontend) | 4 |
| Cobertura estimada | No instrumentada |

### Build

| Métrica | Estado |
|---------|--------|
| Backend compilación | ✅ `tsc` OK |
| Frontend compilación | ❌ **Error TS2739** en `local-db.spec.ts` |
| Build completo | ❌ Falla por type error en frontend test |

### Lint

| Métrica | Estado |
|---------|--------|
| ESLint backend | ❌ **Config issue** — ESLint flat config (eslint.config.js) no encuentra `@eslint/js` |
| ESLint frontend | No evaluado |

---

## 2. Errores detectados

### 🔴 Crítico (bloquea build)

**Error TS2739 en `frontend/src/db/local-db.spec.ts:66`**
```
Type '...' is missing properties 'version', 'device_id' from type 'OfflineWorkBlock'
```
- El tipo `OfflineWorkBlock` espera los campos `version` y `device_id`
- El test no los incluye en el objeto mock
- **Impacto:** Impide `npm run build` completo

### 🟡 Lint no funcional

**ESLint config migration issue**
- El proyecto usa `eslint.config.js` (flat config) pero falta instalar `@eslint/js`
- `npm install` no lo incluye como dependencia directa del backend
- **Impacto:** No se puede ejecutar lint automático

---

## 3. Deuda técnica

### Archivos grandes (potenciales candidatos a refactor)

No se detectaron archivos individuales >300 líneas en backend (el total backend son 4313 líneas distribuidas en módulos).

### Distribución backend (4313 líneas)

| Módulo | Archivos |
|--------|----------|
| ai-advisor | 3 (service, controller, dto, versioning, cost tracking) |
| auth | JWT, guards, middleware, tenant context |
| auth-login | login endpoint |
| core-mes-production | módulo core MES |
| cost | costes |
| db | PostgreSQL provider |
| global-admin | admin multi-tenant |
| incidencias | incidencias |
| oee | OEE metrics |
| orders | órdenes |
| quality | calidad |
| queue | BullMQ workers |
| telemetry | OpenTelemetry |
| tenant-capabilities | feature flags + custom fields |
| toolings | utillajes |
| users | usuarios |
| workstations | puestos de trabajo |

### Frontend (7912 líneas)

| Archivo | Líneas | Observación |
|---------|--------|-------------|
| `App.tsx` | ? | Posible candidato a dividir |
| Paneles | varios | Múltiples paneles específicos (Operator, Supervisor, Admin) |

---

## 4. Seguridad (quick check)

- ✅ **JWT** implementado con middleware tenant-context
- ✅ **RLS** en PostgreSQL (multi-tenant)
- ✅ **Zod** para validación de entrada (presente en módulos core)
- ✅ No se detectaron secretos en el código

---

## 5. Issues encontrados (ordenados por prioridad)

| # | Prioridad | Issue | Módulo | Solución propuesta |
|---|-----------|-------|--------|-------------------|
| 1 | 🔴 | Build roto por TS2739 en test | frontend/db | Añadir `version` y `device_id` al mock |
| 2 | 🟡 | ESLint no funcional | backend | Instalar `@eslint/js` o migrar config |
| 3 | 🟢 | Frontend sin apenas tests | frontend | Añadir tests a componentes core |

---

## 6. Estado del proyecto

```
Tests:    ✅ 208/208 pasando (backend)
Build:    ❌ Falla (frontend type error)
Lint:     ❌ No funcional (config issue)
Frontend: ⚠️ 4 test files, 7912 líneas
Backend:  ✅ Bien modularizado, 27 test files
```

---

*Próximo paso: Arreglar build (Issue #1) y dejar el proyecto compilando.*
