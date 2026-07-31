-- Agrega columna version para control de conflictos offline
-- Ejecutar en producción: psql -f migration-003-offline-conflicts.sql

ALTER TABLE production_work_blocks
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE production_work_blocks
  ADD COLUMN IF NOT EXISTS device_id VARCHAR(255) DEFAULT 'unknown';

-- El ON CONFLICT ya existe en tenant_id + client_event_id
-- Añadir índice para búsqueda por client_event_id en sync
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_blocks_client_event
  ON production_work_blocks (tenant_id, client_event_id);

COMMENT ON COLUMN production_work_blocks.version IS 'Control de versiones para resolver conflictos de sincronización offline. Se incrementa en cada sync.';
COMMENT ON COLUMN production_work_blocks.device_id IS 'Identificador único del dispositivo que originó el bloque offline.';
