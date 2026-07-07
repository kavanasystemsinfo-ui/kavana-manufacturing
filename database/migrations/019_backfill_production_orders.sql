-- Migration 019: Backfill production_orders from orders for operator HMI compatibility
-- ponytail: Existing orders created before Fase 1.5 were only in 'orders' table.
-- Supervisor panel creates in 'orders'; operator HMI reads from 'production_orders'.
-- This migration creates missing production_orders rows for existing orders.

INSERT INTO production_orders (
    id,
    tenant_id,
    code,
    target_quantity,
    produced_quantity,
    defect_quantity,
    status,
    workstation_id,
    custom_fields,
    created_at,
    updated_at
)
SELECT
    o.id,
    o.tenant_id,
    COALESCE(o.custom_fields->>'numero_orden', 'ORD-' || UPPER(SUBSTRING(o.id::text, 1, 8))) AS code,
    o.quantity::numeric(12,4) AS target_quantity,
    COALESCE(o.produced_quantity, 0)::numeric(12,4) AS produced_quantity,
    COALESCE(o.defect_quantity, 0)::numeric(12,4) AS defect_quantity,
    CASE o.status
        WHEN 'pending' THEN 'pendiente'
        WHEN 'in_progress' THEN 'en_produccion'
        WHEN 'completed' THEN 'completada'
        ELSE 'pendiente'
    END AS status,
    o.workstation_id,
    COALESCE(o.custom_fields, '{}'::jsonb) AS custom_fields,
    COALESCE(o.created_at, NOW()) AS created_at,
    COALESCE(o.updated_at, NOW()) AS updated_at
FROM orders o
LEFT JOIN production_orders po
    ON po.tenant_id = o.tenant_id AND po.id = o.id
WHERE po.id IS NULL
ON CONFLICT (tenant_id, id) DO NOTHING;
