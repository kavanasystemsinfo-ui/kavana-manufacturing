-- Columnas de control de conflictos offline en production_work_blocks.
--
-- Este fichero vivía en database/migration-003-offline-conflicts.sql, fuera de
-- la carpeta que aplica la cadena, así que una base creada desde cero se quedaba
-- sin la columna `version` y el sync de partes de trabajo
-- (POST /production/time-logs/sync) respondía 400:
--   column "version" of relation "production_work_blocks" does not exist
-- En producción funcionaba porque se había aplicado a mano. Lo destapó el E2E
-- de flujo completo: el parte del operario acababa en la bandeja de fallos.
--
-- Idempotente: se puede aplicar sobre bases que ya tengan las columnas.

ALTER TABLE production_work_blocks
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

ALTER TABLE production_work_blocks
  ADD COLUMN IF NOT EXISTS device_id VARCHAR(255) DEFAULT 'unknown';

-- El UNIQUE de (tenant_id, client_event_id) ya existe; este índice cubre la
-- búsqueda del motor de sync. Sin CONCURRENTLY: la cadena de migraciones aplica
-- los ficheros dentro de una transacción.
CREATE INDEX IF NOT EXISTS idx_work_blocks_client_event
  ON production_work_blocks (tenant_id, client_event_id);

COMMENT ON COLUMN production_work_blocks.version IS 'Control de versiones para resolver conflictos de sincronización offline. Se incrementa en cada sync.';
COMMENT ON COLUMN production_work_blocks.device_id IS 'Identificador único del dispositivo que originó el bloque offline.';
