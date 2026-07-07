# Kavana V3 - Architecture Decision Records

## Estado del documento

- **Estado:** Registro actualizado con unificación de tablas, type casting SQL, guías de usuario en todos los paneles, y Graphify.
- **Última actualización:** 2026-07-07.

## ADR-0001 - Shared-schema multi-tenant con RLS

- **Estado:** Aceptado.
- **Decisión:** Usar una única base de datos lógica con tablas compartidas y segregación por `tenant_id`.
- **Motivo:** Escalabilidad, simplicidad de migraciones y eficiencia de recursos.
- **Consecuencias:** RLS obligatorio, índices liderados por `tenant_id`, riesgo alto de Data Bleeding si se incumplen estándares.

## ADR-0002 - Feature matrix JSONB

- **Estado:** Aceptado.
- **Decisión:** Gestionar módulos, cuotas y configuración mediante `feature_matrix` JSONB.
- **Motivo:** Modularidad tipo Odoo sin fragmentación de esquema.
- **Consecuencias:** Necesaria validación backend, caché L1/L2 e invalidación.

## ADR-0003 - HMI offline-first

- **Estado:** Aceptado.
- **Decisión:** Persistir eventos de planta en IndexedDB antes de llamar a API.
- **Motivo:** Resiliencia ante caídas de red industrial.
- **Consecuencias:** Cola FIFO, idempotencia, dead-letter storage y sincronización diferida.

## ADR-0004 - UX de visión de túnel

- **Estado:** Aceptado.
- **Decisión:** HMI de operario con una acción principal por pantalla y botones mínimos de 64px.
- **Motivo:** Minimizar carga cognitiva y errores táctiles.
- **Consecuencias:** Menos flexibilidad visual, pero mayor seguridad operativa.

## ADR-0005 - Dual Theme System (Clásico + Moderno)

- **Estado:** Aceptado.
- **Decisión:** Implementar sistema de temas dual con toggle flotante y persistencia en localStorage.
- **Motivo:** Respetar la diversidad de usuarios industriales — supervisores veteranos vs operarios jóvenes.
- **Alternativas evaluadas:**
  - Solo tema moderno → Descartada: alienaría usuarios tradicionales
  - Solo tema clásico → Descartada: perdería ventaja visual competitiva
  - Temas por rol → Descartada: inflexible, no permite elección personal
- **Consecuencias:**
  - 2x componentes UI (pero共享 lógica de negocio via Zustand store)
  - Mantenimiento adicional pero mayor adopción
  - Diferenciación competitiva vs Odoo/MESBook
