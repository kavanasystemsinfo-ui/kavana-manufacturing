# Mapa de conocimiento de dominios KAVANA MANUFACTURING

Este documento resume los dominios de negocio que debe conocer cualquier agente IA antes de escribir código en KAVANA MANUFACTURING.

## 1. Tenant

Responsabilidad: configuración multi-empresa.

Conceptos:

- Tenant.
- Roles.
- Permisos.
- Topología de puestos.
- Grupos de puestos.
- Costes globales.
- Branding.
- Planes.
- Secuencias.
- Jobs programados.

Referencia V2:

- [`Tenant.js`](../backend/src/models/Tenant.js:1)
- [`TenantService.js`](../backend/src/services/TenantService.js:1)
- [`DECISIONES_ESTRATEGICAS.md`](../_KAVANA_SYSTEMS_DOCS/DECISIONES_ESTRATEGICAS.md:1)

Decisión V3:

- Mantener multi-tenant nativo.
- Separar configuración, permisos, costes, branding y planes.

## 2. Catálogo técnico

Responsabilidad: productos, materiales, modelos de fabricación, BOM y especificaciones.

Conceptos:

- Material.
- Producto.
- Modelo de fabricación.
- Puestos compatibles.
- Velocidad.
- Unidad.
- ScrapGap.
- Peso unitario.
- RAL.
- Blueprint.
- Plan de calidad.
- Longitudes predefinidas.

Referencia V2:

- [`ManufacturingModel.js`](../backend/src/models/ManufacturingModel.js:1)
- [`Material.js`](../backend/src/models/Material.js:1)
- [`MODULO_MATERIALES.md`](../_KAVANA_SYSTEMS_DOCS/MODULO_MATERIALES.md:1)
- [`LOGICA_CASCADA_Y_MODELOS.md`](../_KAVANA_SYSTEMS_DOCS/LOGICA_CASCADA_Y_MODELOS.md:1)

Decisión V3:

- Mantener modelo como plantilla industrial.
- Añadir versionado de especificaciones.
- Separar catálogo técnico de configuración de producción.

## 3. Órdenes de producción

Responsabilidad: hilo conductor de fabricación.

Conceptos:

- Orden.
- Líneas.
- Puesto.
- Secuencia.
- Cliente.
- Prioridad.
- Estado.
- RAL.
- Coste estimado.
- Coste real.
- Cascada.
- Cierre.
- Merma.

Referencia V2:

- [`Order.js`](../backend/src/models/Order.js:1)
- [`OrderService.js`](../backend/src/services/OrderService.js:1)
- [`UX_CREAR_ORDEN.md`](../_KAVANA_SYSTEMS_DOCS/UX_CREAR_ORDEN.md:1)

Decisión V3:

- Separar cabecera, líneas, eventos, consumos y costes.
- No copiar `OrderService` como monolito.
- Extraer reglas a servicios especializados.

## 4. Producción

Responsabilidad: ejecución real en planta.

Conceptos:

- Inicio de sesión.
- Registro incremental.
- Validación de cascada.
- Consumo de material.
- Scrap.
- Merma.
- Finalización.
- Trazabilidad.
- Eventos inmutables.

Referencia V2:

- [`OrderService.recordProduction()`](../backend/src/services/OrderService.js:553)
- [`ProductionLog.js`](../backend/src/models/ProductionLog.js:1)
- [`LOGICA_CASCADA_Y_MODELOS.md`](../_KAVANA_SYSTEMS_DOCS/LOGICA_CASCADA_Y_MODELOS.md:1)

Decisión V3:

- Todo evento productivo debe ser append-only.
- Las compensaciones deben ser eventos explícitos, no borrados.

## 5. Inventario FIFO

Responsabilidad: recepción, ubicación y consumo de lotes.

Conceptos:

- Lote.
- Bobina.
- CoilId.
- Material.
- Ancho.
- Espesor.
- Peso.
- Longitud.
- Coste real.
- FIFO.
- Ubicación.
- Estado.
- Retal.
- Pico.
- Auditoría.

Referencia V2:

- [`StockItem.js`](../backend/src/models/StockItem.js:1)
- [`MaterialTransaction.js`](../backend/src/models/MaterialTransaction.js:1)
- [`InventoryService.js`](../backend/src/services/InventoryService.js:1)
- [`MaterialScanner.jsx`](../frontend/src/components/operator/MaterialScanner.jsx:1)
- [`MODULO_MATERIALES.md`](../_KAVANA_SYSTEMS_DOCS/MODULO_MATERIALES.md:1)

Decisión V3:

- Mantener FIFO.
- Mantener coste real por lote.
- Mantener escaneo de bobinas.
- Separar recepción, consumo y reconciliación.

## 6. Trazabilidad ISO

Responsabilidad: auditoría completa de producción.

Conceptos:

- Evento.
- Orden.
- Línea.
- Puesto.
- Operario.
- Lote.
- Cantidad.
- Scrap.
- Merma.
- Calidad.
- Incidencia.

Referencia V2:

- [`ProductionLog.js`](../backend/src/models/ProductionLog.js:1)
- [`TraceabilityService.js`](../backend/src/services/TraceabilityService.js:1)
- [`DECISIONES_ESTRATEGICAS.md`](../_KAVANA_SYSTEMS_DOCS/DECISIONES_ESTRATEGICAS.md:18)

Decisión V3:

- Eventos append-only.
- Sin borrado manual.
- Compensaciones explícitas.

## 7. Calidad

Responsabilidad: inspecciones y evidencias.

Conceptos:

- Plan de calidad.
- Registro de calidad.
- Evidencias.
- Adjuntos.
- No conformidad.
- Aceptación/rechazo.

Referencia V2:

- [`QualityRecord.js`](../backend/src/models/QualityRecord.js:1)
- [`QualityService.js`](../backend/src/services/QualityService.js:1)
- [`ManufacturingModel.js`](../backend/src/models/ManufacturingModel.js:75)

Decisión V3:

- Calidad como dominio obligatorio para clientes ISO.
- Planes de inspección configurables.

## 8. Mantenimiento

Responsabilidad: mantenimiento preventivo por uso real.

Conceptos:

- Puesto.
- Máquina.
- Horas.
- Contador.
- Mantenimiento preventivo.
- Órdenes de mantenimiento.
- Evidencias.

Referencia V2:

- [`Tenant.js`](../backend/src/models/Tenant.js:52)
- [`MaintenanceService.js`](../backend/src/services/MaintenanceService.js:1)
- [`DECISIONES_ESTRATEGICAS.md`](../_KAVANA_SYSTEMS_DOCS/DECISIONES_ESTRATEGICAS.md:79)

Decisión V3:

- Conectar mantenimiento a eventos reales de máquina y producción.

## 9. Costes y KPIs

Responsabilidad: margen, costes reales y eficiencia.

Conceptos:

- Coste material.
- Coste máquina.
- Coste operario.
- Overhead.
- Margen.
- KPI.
- OEE.
- Scrap.
- Merma.
- Tiempo productivo.
- Tiempo parado.

Referencia V2:

- [`OrderCostCalculator.js`](../backend/src/services/OrderCostCalculator.js:1)
- [`KPIService.js`](../backend/src/services/KPIService.js:1)
- [`OEEService.js`](../backend/src/services/OEEService.js:1)
- [`Tenant.js`](../backend/src/models/Tenant.js:93)

Decisión V3:

- Calcular analítica desde eventos inmutables.
- Evitar depender de estados mutables.

## 10. IA contextual

Responsabilidad: análisis industrial asistido.

Conceptos:

- Snapshot de fábrica.
- Consultas contextuales.
- Alertas.
- Recomendaciones.
- Fallback local/cloud.
- Seguridad de datos.

Referencia V2:

- [`IntelligenceService.js`](../backend/src/services/IntelligenceService.js:1)
- [`KAVANA_INTELLIGENCE.md`](../_KAVANA_SYSTEMS_DOCS/KAVANA_INTELLIGENCE.md:1)
- [`DECISIONES_ESTRATEGICAS.md`](../_KAVANA_SYSTEMS_DOCS/DECISIONES_ESTRATEGICAS.md:243)

Decisión V3:

- IA como capa externa al core MES.
- No mezclar IA con lógica crítica de inventario o costes.

## 11. UX industrial

Responsabilidad: interfaz usable en planta.

Conceptos:

- Botones grandes.
- Alto contraste.
- Feedback visual.
- Cero ruido.
- Navegación por rol.
- Zero-click login.
- Modo kiosco/tablet.
- Un vistazo, un click.

Referencia V2:

- [`KAVANA_ULTRA_DOC.md`](../_KAVANA_SYSTEMS_DOCS/KAVANA_ULTRA_DOC.md:1)
- [`PANEL_OPERARIO_UX.md`](../_KAVANA_SYSTEMS_DOCS/PANEL_OPERARIO_UX.md:1)
- [`PANEL_SUPERVISOR_INTELIGENTE.md`](../_KAVANA_SYSTEMS_DOCS/PANEL_SUPERVISOR_INTELIGENTE.md:1)

Decisión V3:

- Mantener identidad industrial.
- No rediseñar hacia una UI genérica.
