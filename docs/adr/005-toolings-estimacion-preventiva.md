# ADR-0005: Toolings — Estimación preventiva de vida útil

**Fecha:** 2026-07-21
**Estado:** Aceptado
**Contexto:** Control de vida útil de troqueles, moldes y herramientas de producción

## Contexto

Un MES necesita controlar la vida útil de las herramientas de producción (troqueles, moldes, punzones, etc.). Sin conexión a PLC ni sistema IoT, un sistema de tracking en tiempo real no tiene sentido. Se necesita una alternativa que:

1. Sea útil como demo para reclutadores
2. Demuestre lógica de negocio real
3. Sea honesta sobre sus limitaciones (no pretender tracking sin hardware)

## Decisión

Implementar como **sistema de estimación preventiva** con ciclos por pieza.

### Modelo de datos

```sql
-- toolings
id, code, name, type, location, status,
current_cycles NUMERIC,     -- ciclos acumulados (estimados)
max_cycles INTEGER,         -- vida útil total
warning_pct INTEGER,        -- umbral de aviso (default 80%)
cycles_per_piece NUMERIC,   -- ciclos consumidos por pieza
estimated_pieces INTEGER,   -- piezas producidas (auto-calculado)

-- workstations
tooling_id UUID REFERENCES toolings(id) -- utillaje asignado
```

### Flujo de estimación

1. Admin configura utillaje: `cycles_per_piece = 0.5`, `max_cycles = 100000`
2. Asigna utillaje a estación de trabajo
3. Operario registra producción → `POST /toolings/:id/produce { pieces: 200 }`
4. Backend calcula: `current_cycles += 0.5 × 200 = 100`
5. Cuando `current_cycles >= max_cycles × (warning_pct/100)` → alerta naranja

### Configuración por tenant

Los tipos de utillaje son configurables via `tenants.feature_matrix -> tooling.types`. Cada fábrica define sus propios tipos (troquel, molde, cliché, estampa, etc.).

## Consecuencias

### Positivas
- Módulo funcional que demuestra lógica de negocio
- UX clara con messaging honesto ("estimación preventiva")
- Configurable por tenant (tipos personalizados)
- Base para futura integración con PLC real

### Negativas
- No es tracking en tiempo real (es una estimación)
- Requiere configuración manual de `cycles_per_piece`
- Sin integración con hardware real

### Riesgos
- Un usuario podría confundir "estimación" con "tracking real" → mitigado con banner azul explicativo

## Alternativas consideradas

| Alternativa | Pros | Contras | Decisión |
|------------|------|---------|----------|
| Tracking PLC/IoT | Precisión real | Sin hardware, inviable | Descartada |
| Contador manual simple | Simple | Incoherente, sin sentido | Descartada |
| Estimación por ciclos/pieza | Coherente, demostrable | Es una estimación | **Elegida** |
| Sin módulo | YAGNI | Falta feature típica de MES | Descartada |

## Archivos

- `backend/src/toolings/` — NestJS module
- `database/migrations/025_create_toolings.sql`
- `database/migrations/026_toolings_estimation.sql`
- `frontend/src/AdminPanel.tsx` — ToolingsTab
- `frontend/src/api/admin-entities.ts` — API functions
