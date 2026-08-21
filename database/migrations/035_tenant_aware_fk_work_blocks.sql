-- Migration 035: FK compuesta tenant-aware en production_work_blocks → orders
--
-- La migración 022 dejó la FK como FOREIGN KEY (order_id) REFERENCES
-- orders(id), sin verificar que el block y la order pertenezcan al mismo
-- tenant. Con RLS activo el riesgo es bajo, pero si RLS se desactiva u
-- omite (mantenimiento, migración de datos, bug), un work block podría
-- asociarse a una order de otro tenant.
--
-- Fix: UNIQUE (tenant_id, id) en orders + FK compuesta
-- (tenant_id, order_id) → orders(tenant_id, id). La BD pasa a garantizar
-- la integridad referencial cross-tenant aunque la aplicación falle.

-- 1. UNIQUE (tenant_id, id) necesario para la FK compuesta.
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_tenant_id ON orders (tenant_id, id);

-- 2. Sustituir la FK simple por la compuesta.
ALTER TABLE production_work_blocks DROP CONSTRAINT IF EXISTS fk_pwb_orders;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'fk_pwb_orders_tenant'
      AND conrelid = 'production_work_blocks'::regclass
  ) THEN
    ALTER TABLE production_work_blocks
      ADD CONSTRAINT fk_pwb_orders_tenant
      FOREIGN KEY (tenant_id, order_id)
      REFERENCES orders (tenant_id, id)
      ON DELETE CASCADE;
  END IF;
END $$;
