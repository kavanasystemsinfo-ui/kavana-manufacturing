-- Migration 034: RLS para raw_materials y bom_items
--
-- La migración 028 creó estas tablas SIN activar Row Level Security.
-- Ambas están expuestas por la API con CRUD completo
-- (backend/src/materials/materials.controller.ts) y el aislamiento
-- dependía únicamente del filtro de aplicación en SQL
-- (tenant_id = get_current_tenant()). Sin RLS, cualquier query que se
-- olvide del filtro (o un futuro JOIN mal construido) filtra datos de
-- materias primas y BOM entre tenants: costes unitarios, proveedores y
-- recetas de fabricación son información comercial sensible.
--
-- Fix: mismo patrón fail-closed que orders/production_work_blocks:
-- ENABLE + FORCE + política FOR ALL TO kavana_app con USING/WITH CHECK.

ALTER TABLE raw_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_materials FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_raw_materials_tenant_isolation ON raw_materials;
CREATE POLICY rls_raw_materials_tenant_isolation
  ON raw_materials FOR ALL TO kavana_app
  USING (tenant_id = get_current_tenant())
  WITH CHECK (tenant_id = get_current_tenant());

ALTER TABLE bom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bom_items FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rls_bom_items_tenant_isolation ON bom_items;
CREATE POLICY rls_bom_items_tenant_isolation
  ON bom_items FOR ALL TO kavana_app
  USING (tenant_id = get_current_tenant())
  WITH CHECK (tenant_id = get_current_tenant());
