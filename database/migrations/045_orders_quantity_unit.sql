-- Migration 045: unidad de la cantidad de la orden (piezas o metros).
--
-- La orden hereda la unidad del modelo de fabricación: si el modelo se mide
-- en m/h, la orden cuenta metros (NUMERIC(12,4), admite decimales); si es
-- piezas/h, kg/h o L/h, la cantidad es entera. Por defecto 'piezas' para no
-- romper órdenes existentes ni la demo.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity_unit TEXT NOT NULL DEFAULT 'piezas'
  CHECK (quantity_unit IN ('piezas', 'm'));
