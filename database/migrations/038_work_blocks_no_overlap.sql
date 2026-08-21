-- Migration 038: exclusion constraint anti-solapamiento por operario
--
-- FIX A3 (auditoría adversarial 2026-08-21): el overlap check en
-- syncWorkBlock (SELECT ... OVERLAPS) y el INSERT comparten transacción,
-- pero sin lock sobre los bloques DEL OPERARIO dos requests simultáneos
-- del mismo operario con órdenes distintas pasan el check ambos y se
-- cuelan bloques solapados (carrera cross-orden; lockOrder solo bloquea
-- la orden, no al operario).
--
-- La exclusion constraint mueve la garantía a la BD: es imposible insertar
-- dos bloques solapados del mismo operario, gane la carrera quien gane.
-- Requiere la extensión btree_gist para mezclar igualdad (operator_id)
-- con solapamiento de rango (timestamptz).

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Limpiar posibles solapes históricos antes de añadir la constraint
-- (la constraint fallaría si existen violaciones previas). Conservador:
-- no borra nada, solo informa vía excepción si hay datos a revisar.
DO $$
DECLARE
    conflict_count INT;
BEGIN
    SELECT COUNT(*) INTO conflict_count FROM (
        SELECT a.id
        FROM production_work_blocks a
        JOIN production_work_blocks b
          ON a.tenant_id = b.tenant_id
         AND a.operator_id = b.operator_id
         AND a.id < b.id
         AND (a.start_time, a.end_time) OVERLAPS (b.start_time, b.end_time)
    ) s;
    IF conflict_count > 0 THEN
        RAISE NOTICE 'ATENCIÓN: % pares de bloques solapados existentes. Revisar antes de confiar en la constraint.', conflict_count;
    END IF;
END $$;

-- Exclusion: mismo tenant + mismo operario → rangos de tiempo NO solapables.
ALTER TABLE production_work_blocks DROP CONSTRAINT IF EXISTS ex_pwb_operator_no_overlap;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ex_pwb_operator_no_overlap'
          AND conrelid = 'production_work_blocks'::regclass
    ) THEN
        ALTER TABLE production_work_blocks
          ADD CONSTRAINT ex_pwb_operator_no_overlap
          EXCLUDE USING gist (
            tenant_id WITH =,
            operator_id WITH =,
            tstzrange(start_time, end_time) WITH &&
          );
    END IF;
END $$;
