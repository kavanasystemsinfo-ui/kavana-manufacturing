-- Migration: Add target_rate to manufacturing_models
-- target_rate is the expected production rate (e.g., 100 piezas/h)
-- Nullable: only meaningful when oee_monitoring module is enabled

ALTER TABLE manufacturing_models
  ADD COLUMN target_rate NUMERIC(12,2);

-- No CHECK constraint: target_rate is nullable and optional
-- When NULL, OEE performance calculation uses theoretical max from unit_of_measure defaults
