-- Migration 043: Add current_stock column to raw_materials for stock critical alerts

ALTER TABLE raw_materials
ADD COLUMN IF NOT EXISTS current_stock NUMERIC(12,2) DEFAULT 0;