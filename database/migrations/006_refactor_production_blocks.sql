-- 006_refactor_production_blocks.sql

-- 1. Actualizar estados válidos de órdenes de producción
ALTER TABLE production_orders DROP CONSTRAINT production_orders_status_check;
ALTER TABLE production_orders 
  ADD CONSTRAINT production_orders_status_check 
  CHECK (status IN ('pendiente', 'en_produccion', 'completada'));

-- Si hay órdenes antiguas con estados inválidos, las normalizamos a 'pendiente'
UPDATE production_orders 
SET status = 'pendiente' 
WHERE status NOT IN ('pendiente', 'en_produccion', 'completada');

-- 2. Renombrar tabla y reconstruir columnas
ALTER TABLE production_time_logs RENAME TO production_work_blocks;

-- Eliminar columna vieja de eventos
ALTER TABLE production_work_blocks DROP COLUMN event_type;

-- Añadir nuevas columnas obligatorias
ALTER TABLE production_work_blocks 
  ADD COLUMN type VARCHAR(50) NOT NULL CHECK (type IN ('produccion', 'parada')) DEFAULT 'produccion',
  ADD COLUMN start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN end_time TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Quitar los DEFAULTs una vez aplicada
ALTER TABLE production_work_blocks ALTER COLUMN type DROP DEFAULT;
ALTER TABLE production_work_blocks ALTER COLUMN start_time DROP DEFAULT;
ALTER TABLE production_work_blocks ALTER COLUMN end_time DROP DEFAULT;

-- Validar que start_time sea siempre menor que end_time
ALTER TABLE production_work_blocks 
  ADD CONSTRAINT work_blocks_time_check 
  CHECK (start_time < end_time);

-- Validaciones condicionales a nivel de base de datos
ALTER TABLE production_work_blocks
  ADD CONSTRAINT work_blocks_type_check
  CHECK (
    (type = 'produccion' AND produced_quantity IS NOT NULL) OR
    (type = 'parada' AND downtime_reason IS NOT NULL)
  );
