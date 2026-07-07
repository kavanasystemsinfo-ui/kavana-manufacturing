-- Migration 021: Prepare orders to become the canonical production table
-- ponytail: Orders will absorb production_orders. This adds code (required by
-- production_orders schema), makes model_id nullable (legacy entries had no model),
-- and backfills code from custom_fields.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS code VARCHAR(100);

ALTER TABLE orders ALTER COLUMN model_id DROP NOT NULL;

UPDATE orders
  SET code = COALESCE(custom_fields->>'numero_orden', 'ORD-' || UPPER(SUBSTRING(id::text, 1, 8)))
  WHERE code IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_tenant_code
  ON orders (tenant_id, UPPER(code));
