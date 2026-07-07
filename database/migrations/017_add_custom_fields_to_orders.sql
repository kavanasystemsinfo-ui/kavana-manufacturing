-- Migration 017: Add custom_fields to orders table
-- Allows supervisors to attach metadata (order number, measurements, etc.) to orders
-- Operator sees these as read-only

ALTER TABLE orders ADD COLUMN IF NOT EXISTS custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb;
