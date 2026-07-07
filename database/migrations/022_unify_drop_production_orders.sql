-- Migration 022: Unify — drop production_orders, FK now points to orders
-- ponytail: Single source of truth. Transfer legacy data, update FK, drop old table.

-- 1. Transfer rows from production_orders that don't exist in orders
INSERT INTO orders (id, tenant_id, model_id, workstation_id, quantity, status, created_by, custom_fields, produced_quantity, defect_quantity, code, created_at, updated_at)
SELECT
  po.id,
  po.tenant_id,
  NULL::UUID AS model_id,
  po.workstation_id,
  po.target_quantity::INT AS quantity,
  CASE po.status
    WHEN 'pendiente' THEN 'pending'
    WHEN 'en_produccion' THEN 'in_progress'
    WHEN 'completada' THEN 'completed'
    ELSE 'pending'
  END AS status,
  'system' AS created_by,
  po.custom_fields,
  COALESCE(po.produced_quantity, 0) AS produced_quantity,
  COALESCE(po.defect_quantity, 0) AS defect_quantity,
  COALESCE(po.code, 'ORD-' || UPPER(SUBSTRING(po.id::text, 1, 8))) AS code,
  po.created_at,
  po.updated_at
FROM production_orders po
WHERE NOT EXISTS (
  SELECT 1 FROM orders o WHERE o.id = po.id
);

-- 2. For rows that exist in both, sync produced/defect (operator may have updated production_orders)
UPDATE orders o SET
  produced_quantity = GREATEST(o.produced_quantity, COALESCE(po.produced_quantity, 0)),
  defect_quantity = GREATEST(o.defect_quantity, COALESCE(po.defect_quantity, 0)),
  code = COALESCE(o.code, po.code, 'ORD-' || UPPER(SUBSTRING(o.id::text, 1, 8)))
FROM production_orders po
WHERE po.id = o.id
  AND po.tenant_id = o.tenant_id;

-- 3. Drop old FK from production_work_blocks to production_orders
DO $$
DECLARE
  con_name TEXT;
BEGIN
  SELECT conname INTO con_name
  FROM pg_constraint
  WHERE conrelid = 'production_work_blocks'::regclass
    AND confrelid = 'production_orders'::regclass;

  IF con_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE production_work_blocks DROP CONSTRAINT ' || quote_ident(con_name);
  END IF;
END $$;

-- 4. Alternative FK name (from migration 004, persisted after rename)
ALTER TABLE production_work_blocks DROP CONSTRAINT IF EXISTS fk_production_time_logs_order CASCADE;
ALTER TABLE production_work_blocks DROP CONSTRAINT IF EXISTS fk_pwb_order CASCADE;

-- 5. Create new FK to orders (simple FK, no composite — orders has single PK)
ALTER TABLE production_work_blocks
  ADD CONSTRAINT fk_pwb_orders
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- 6. Drop production_orders table
DROP TABLE IF EXISTS production_orders CASCADE;
