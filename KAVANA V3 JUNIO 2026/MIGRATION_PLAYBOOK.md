# Playbook de migración de V2 a V3

Este documento explica cómo extraer valor de V2 sin arrastrar deuda técnica.

## Regla de oro

No migrar archivos completos salvo que sean documentación, modelos simples o utilidades puras.

Migrar:

- Reglas de negocio.
- Contratos de datos.
- Flujos validados.
- UX probada.
- Decisiones estratégicas.
- Tests de regresión.

No migrar:

- Monolitos.
- UI duplicada.
- Scripts de reparación.
- Logs de debug.
- Hardcoding.
- Dependencias innecesarias.

## Paso 1: leer contexto

Antes de migrar una feature, leer:

1. [`AGENTS.md`](AGENTS.md)
2. [`AUDITORIA_TECNICA_SENIOR_KAVANA_V3.md`](AUDITORIA_TECNICA_SENIOR_KAVANA_V3.md)
3. [`DOMAIN_KNOWLEDGE_MAP.md`](DOMAIN_KNOWLEDGE_MAP.md)
4. [`REUSABLE_ASSETS.md`](REUSABLE_ASSETS.md)

## Paso 2: identificar dominio

Clasificar la feature en uno de estos dominios:

- Tenant
- Auth
- Catálogo
- Órdenes
- Producción
- Inventario
- Trazabilidad
- Calidad
- Mantenimiento
- Costes
- KPIs/OEE
- IA
- Exportaciones
- UX industrial

## Paso 3: buscar activos V2

Usar [`REUSABLE_ASSETS.md`](REUSABLE_ASSETS.md) para encontrar archivos V2 equivalentes.

Ejemplo:

- Si se implementa FIFO, consultar:
  - [`InventoryService.js`](../backend/src/services/InventoryService.js:1)
  - [`StockItem.js`](../backend/src/models/StockItem.js:1)
  - [`MaterialScanner.jsx`](../frontend/src/components/operator/MaterialScanner.jsx:1)

## Paso 4: extraer reglas, no copiar código

Para cada servicio V2:

1. Leer flujo.
2. Listar reglas de negocio.
3. Convertir reglas en tests.
4. Reimplementar en V3 con arquitectura modular.
5. Comparar resultados.

## Paso 5: tests mínimos obligatorios

Antes de considerar migrada una regla crítica, crear tests para:

- Costes.
- FIFO.
- Lotes.
- Scrap.
- Merma.
- Cascada.
- Trazabilidad.
- Calidad.
- Permisos.
- Secuencias.

## Paso 6: migrar frontend

Para componentes UI:

1. Copiar solo la intención UX.
2. Reimplementar con componentes base de V3.
3. Mantener botones grandes, alto contraste y navegación simple.
4. Evitar lógica de negocio incrustada en JSX.
5. Extraer hooks y utilidades.

## Paso 7: migrar documentación

Documentación V2 útil:

- [`DECISIONES_ESTRATEGICAS.md`](../_KAVANA_SYSTEMS_DOCS/DECISIONES_ESTRATEGICAS.md:1)
- [`KAVANA_ULTRA_DOC.md`](../_KAVANA_SYSTEMS_DOCS/KAVANA_ULTRA_DOC.md:1)
- [`LOGICA_CASCADA_Y_MODELOS.md`](../_KAVANA_SYSTEMS_DOCS/LOGICA_CASCADA_Y_MODELOS.md:1)
- [`MODULO_MATERIALES.md`](../_KAVANA_SYSTEMS_DOCS/MODULO_MATERIALES.md:1)
- [`KAVANA_INTELLIGENCE.md`](../_KAVANA_SYSTEMS_DOCS/KAVANA_INTELLIGENCE.md:1)

## Checklist por feature

```text
[ ] Dominio identificado
[ ] Activos V2 localizados
[ ] Decisión: rescatar/refactorizar/descartar
[ ] Reglas de negocio listadas
[ ] Tests escritos
[ ] Modelo V3 definido
[ ] API V3 definida
[ ] UI V3 definida
[ ] Migración ejecutada
[ ] Validación manual completada
```

## Ejemplo: migrar inventario FIFO

1. Leer [`InventoryService.js`](../backend/src/services/InventoryService.js:1).
2. Leer [`StockItem.js`](../backend/src/models/StockItem.js:1).
3. Leer [`MaterialScanner.jsx`](../frontend/src/components/operator/MaterialScanner.jsx:1).
4. Extraer reglas:
   - Recepción crea lote.
   - Lote tiene coste real.
   - Consumo usa FIFO.
   - Auditoría obliga bobina vinculada.
   - Retal y merma se declaran en planta.
5. Escribir tests.
6. Implementar dominio `inventory` en V3.
7. Integrar componente de escaneo.
8. Validar con datos reales.

## Ejemplo: migrar producción

1. Leer [`OrderService.recordProduction()`](../backend/src/services/OrderService.js:553).
2. Separar responsabilidades:
   - Validación de cascada.
   - Cálculo de consumo.
   - Consumo FIFO.
   - Registro de MaterialConsumo.
   - Registro de ProductionLog.
   - Coste laboral/máquina.
   - Desgaste de herramienta.
3. Escribir tests de regresión.
4. Implementar eventos append-only.
5. Integrar con panel de operario.
