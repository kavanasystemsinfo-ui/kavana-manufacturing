# Activos reutilizables desde KAVANA V2

Este documento es el índice práctico para agentes de código. Sirve para responder rápidamente: «¿ya tenemos algo de esto validado en V2?».

## Estado del documento

- **Última actualización:** 2026-07-04. Documentación actualizada con Fase 5.5.

## Código backend reutilizable

| Activo | Archivo V2 | Decisión V3 | Motivo |
|---|---|---|---|
| Tenant multi-empresa | [`backend/src/models/Tenant.js`](../backend/src/models/Tenant.js:1) | Refactorizar | Contiene configuración SaaS, topología, costes, planes y branding. |
| Usuario | [`backend/src/models/User.js`](../backend/src/models/User.js:1) | Refactorizar | Roles, sesión y operarios son útiles. |
| Órdenes | [`backend/src/models/Order.js`](../backend/src/models/Order.js:1) | Refactorizar | Modelo de orden válido, pero documento demasiado cargado. |
| Modelos de fabricación | [`backend/src/models/ManufacturingModel.js`](../backend/src/models/ManufacturingModel.js:1) | Rescatar | Pieza central del catálogo técnico. |
| Materiales | [`backend/src/models/Material.js`](../backend/src/models/Material.js:1) | Rescatar | Base de catálogo y costes. |
| StockItem | [`backend/src/models/StockItem.js`](../backend/src/models/StockItem.js:1) | Rescatar | Lotes, bobinas, FIFO y valoración real. |
| MaterialTransaction | [`backend/src/models/MaterialTransaction.js`](../backend/src/models/MaterialTransaction.js:1) | Rescatar | Kardex imprescindible. |
| MaterialConsumo | [`backend/src/models/MaterialConsumo.js`](../backend/src/models/MaterialConsumo.js:1) | Rescatar | Consumo real por orden. |
| ProductionLog | [`backend/src/models/ProductionLog.js`](../backend/src/models/ProductionLog.js:1) | Rescatar | Trazabilidad inmutable. |
| QualityRecord | [`backend/src/models/QualityRecord.js`](../backend/src/models/QualityRecord.js:1) | Rescatar | Controles de calidad ISO. |
| Tooling | [`backend/src/models/Tooling.js`](../backend/src/models/Tooling.js:1) | Rescatar | Utillaje y desgaste. |
| Incidencia | [`backend/src/models/Incidencia.js`](../backend/src/models/Incidencia.js:1) | Rescatar | Gestión de incidencias de planta. |
| Lead | [`backend/src/models/Lead.js`](../backend/src/models/Lead.js:1) | Rescatar | Captura comercial. |
| SavedView | [`backend/src/models/SavedView.js`](../backend/src/models/SavedView.js:1) | Refactorizar | Vistas dinámicas útiles. |
| CustomFieldDefinition | [`backend/src/models/CustomFieldDefinition.js`](../backend/src/models/CustomFieldDefinition.js:1) | Refactorizar | Formularios dinámicos. |
| CalculatorPreset | [`backend/src/models/CalculatorPreset.js`](../backend/src/models/CalculatorPreset.js:1) | Rescatar | Calculadora de operario. |
| Sequence | [`backend/src/models/Sequence.js`](../backend/src/models/Sequence.js:1) | Rescatar | Numeración automática. |

## Servicios reutilizables

| Servicio | Archivo V2 | Decisión V3 |
|---|---|---|
| `OrderService` | [`backend/src/services/OrderService.js`](../backend/src/services/OrderService.js:1) | Separar en dominios: órdenes, producción, consumo, costes y trazabilidad. |
| `InventoryService` | [`backend/src/services/InventoryService.js`](../backend/src/services/InventoryService.js:1) | Refactorizar manteniendo FIFO. |
| `OrderCostCalculator` | [`backend/src/services/OrderCostCalculator.js`](../backend/src/services/OrderCostCalculator.js:1) | Rescatar con tests. |
| `KPIService` | [`backend/src/services/KPIService.js`](../backend/src/services/KPIService.js:1) | Rescatar con calibración. |
| `OEEService` | [`backend/src/services/OEEService.js`](../backend/src/services/OEEService.js:1) | Rescatar con pruebas. |
| `QualityService` | [`backend/src/services/QualityService.js`](../backend/src/services/QualityService.js:1) | Rescatar. |
| `MaintenanceService` | [`backend/src/services/MaintenanceService.js`](../backend/src/services/MaintenanceService.js:1) | Rescatar. |
| `TraceabilityService` | [`backend/src/services/TraceabilityService.js`](../backend/src/services/TraceabilityService.js:1) | Rescatar. |
| `IntelligenceService` | [`backend/src/services/IntelligenceService.js`](../backend/src/services/IntelligenceService.js:1) | Refactorizar como capa externa. |
| `ExportService` | [`backend/src/services/ExportService.js`](../backend/src/services/ExportService.js:1) | Refactorizar. |
| `ImportService` | [`backend/src/services/ImportService.js`](../backend/src/services/ImportService.js:1) | Refactorizar con dry-run. |
| `ScheduledExportService` | [`backend/src/services/ScheduledExportService.js`](../backend/src/services/ScheduledExportService.js:1) | Refactorizar como job. |
| `AutomatonService` | [`backend/src/services/AutomatonService.js`](../backend/src/services/AutomatonService.js:1) | Refactorizar como jobs/alertas. |
| `AuditLoggerService` | [`backend/src/services/AuditLoggerService.js`](../backend/src/services/AuditLoggerService.js:1) | Refactorizar logging/Telegram. |
| `StockAlertService` | [`backend/src/services/StockAlertService.js`](../backend/src/services/StockAlertService.js:1) | Rescatar. |
| `ValidationService` | [`backend/src/services/ValidationService.js`](../backend/src/services/ValidationService.js:1) | Refactorizar. |
| `CalculationEngine` | [`backend/src/services/CalculationEngine.js`](../backend/src/services/CalculationEngine.js:1) | Rescatar fórmulas. |
| `SequenceService` | [`backend/src/services/SequenceService.js`](../backend/src/services/SequenceService.js:1) | Rescatar. |
| `TenantService` | [`backend/src/services/TenantService.js`](../backend/src/services/TenantService.js:1) | Refactorizar. |

## Componentes frontend reutilizables

| Componente | Archivo V2 | Decisión V3 |
|---|---|---|
| `MaterialScanner` | [`frontend/src/components/operator/MaterialScanner.jsx`](../frontend/src/components/operator/MaterialScanner.jsx:1) | Rescatar como dominio UI crítico. |
| `CoilCalculator` | [`frontend/src/components/operator/CoilCalculator.jsx`](../frontend/src/components/operator/CoilCalculator.jsx:1) | Rescatar lógica de fin de bobina. |
| `CalculatorModal` | [`frontend/src/components/operator/CalculatorModal.jsx`](../frontend/src/components/operator/CalculatorModal.jsx:1) | Rescatar. |
| `BlueprintViewer` | [`frontend/src/components/operator/BlueprintViewer.jsx`](../frontend/src/components/operator/BlueprintViewer.jsx:1) | Rescatar. |
| `SupervisorDashboard` | [`frontend/src/pages/SupervisorDashboard.jsx`](../frontend/src/pages/SupervisorDashboard.jsx:1) | Refactorizar. |
| `AndonBoard` | [`frontend/src/components/supervisor/AndonBoard.jsx`](../frontend/src/components/supervisor/AndonBoard.jsx:1) | Rescatar. |
| `SupervisorStock` | [`frontend/src/pages/supervisor/SupervisorStock.jsx`](../frontend/src/pages/supervisor/SupervisorStock.jsx:1) | Rescatar. |
| `SupervisorMaintenance` | [`frontend/src/pages/supervisor/SupervisorMaintenance.jsx`](../frontend/src/pages/supervisor/SupervisorMaintenance.jsx:1) | Rescatar. |
| `ManagementDashboard` | [`frontend/src/pages/gerencia/ManagementDashboard.jsx`](../frontend/src/pages/gerencia/ManagementDashboard.jsx:1) | Refactorizar. |
| `KPIs` | [`frontend/src/pages/gerencia/KPIs.jsx`](../frontend/src/pages/gerencia/KPIs.jsx:1) | Rescatar. |
| `CostCenter` | [`frontend/src/pages/admin/CostCenter.jsx`](../frontend/src/pages/admin/CostCenter.jsx:1) | Rescatar. |
| `IntelligenceDashboard` | [`frontend/src/pages/admin/IntelligenceDashboard.jsx`](../frontend/src/pages/admin/IntelligenceDashboard.jsx:1) | Rescatar. |
| `SupervisorAssistant` | [`frontend/src/pages/supervisor/SupervisorAssistant.jsx`](../frontend/src/pages/supervisor/SupervisorAssistant.jsx:1) | Rescatar. |

## Documentación estratégica reutilizable

| Documento | Archivo V2 | Uso |
|---|---|---|
| README técnico | [`_KAVANA_SYSTEMS_DOCS/README.md`](../_KAVANA_SYSTEMS_DOCS/README.md:1) | Visión general. |
| Ultra doc | [`_KAVANA_SYSTEMS_DOCS/KAVANA_ULTRA_DOC.md`](../_KAVANA_SYSTEMS_DOCS/KAVANA_ULTRA_DOC.md:1) | Filosofía UX. |
| Decisiones estratégicas | [`_KAVANA_SYSTEMS_DOCS/DECISIONES_ESTRATEGICAS.md`](../_KAVANA_SYSTEMS_DOCS/DECISIONES_ESTRATEGICAS.md:1) | Decisiones que deben conservarse. |
| Topología de fábrica | [`_KAVANA_SYSTEMS_DOCS/TOPOLOGIA_FABRICA.md`](../_KAVANA_SYSTEMS_DOCS/TOPOLOGIA_FABRICA.md:1) | Puestos, grupos y cascada. |
| Lógica de cascada | [`_KAVANA_SYSTEMS_DOCS/LOGICA_CASCADA_Y_MODELOS.md`](../_KAVANA_SYSTEMS_DOCS/LOGICA_CASCADA_Y_MODELOS.md:1) | Reglas de producción. |
| Módulo materiales | [`_KAVANA_SYSTEMS_DOCS/MODULO_MATERIALES.md`](../_KAVANA_SYSTEMS_DOCS/MODULO_MATERIALES.md:1) | FIFO, bobinas, scrap y geometría. |
| Inteligencia | [`_KAVANA_SYSTEMS_DOCS/KAVANA_INTELLIGENCE.md`](../_KAVANA_SYSTEMS_DOCS/KAVANA_INTELLIGENCE.md:1) | IA contextual. |
| Panel operario UX | [`_KAVANA_SYSTEMS_DOCS/PANEL_OPERARIO_UX.md`](../_KAVANA_SYSTEMS_DOCS/PANEL_OPERARIO_UX.md:1) | UX industrial. |
| Panel supervisor | [`_KAVANA_SYSTEMS_DOCS/PANEL_SUPERVISOR_INTELIGENTE.md`](../_KAVANA_SYSTEMS_DOCS/PANEL_SUPERVISOR_INTELIGENTE.md:1) | UX supervisor. |
| UX crear orden | [`_KAVANA_SYSTEMS_DOCS/UX_CREAR_ORDEN.md`](../_KAVANA_SYSTEMS_DOCS/UX_CREAR_ORDEN.md:1) | Flujo de creación. |
