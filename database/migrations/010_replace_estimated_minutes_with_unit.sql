-- Migration: Replace estimated_minutes with unit_of_measure
-- estimated_minutes belongs to OEE/efficiency module, not base MES

-- 1. Add unit_of_measure column with default
ALTER TABLE manufacturing_models 
  ADD COLUMN unit_of_measure TEXT NOT NULL DEFAULT 'piezas/h';

-- 2. Migrate existing data: convert estimated_minutes to unit_of_measure if present
UPDATE manufacturing_models SET unit_of_measure = 'piezas/h' WHERE estimated_minutes IS NOT NULL;

-- 3. Drop the estimated_minutes column
ALTER TABLE manufacturing_models DROP COLUMN IF EXISTS estimated_minutes;

-- 4. Add CHECK constraint for valid units
ALTER TABLE manufacturing_models 
  ADD CONSTRAINT valid_unit_of_measure 
  CHECK (unit_of_measure IN ('piezas/h', 'm/h', 'kg/h', 'L/h'));
