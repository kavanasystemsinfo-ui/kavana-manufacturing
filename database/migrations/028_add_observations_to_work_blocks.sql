-- Migration 028: Add observations column to production_work_blocks

ALTER TABLE production_work_blocks ADD COLUMN IF NOT EXISTS observations TEXT;
