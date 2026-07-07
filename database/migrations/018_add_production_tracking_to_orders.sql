-- Migration 018: Add production tracking to orders table
-- Allows supervisors to see real-time progress (produced/target) per order

ALTER TABLE orders ADD COLUMN IF NOT EXISTS produced_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (produced_quantity >= 0);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS defect_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (defect_quantity >= 0);
