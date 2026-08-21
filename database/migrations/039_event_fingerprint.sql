-- Migration 039: fingerprint anti-replay de eventos offline
--
-- FIX A4 (auditoría adversarial 2026-08-21): el dedup por client_event_id
-- (UNIQUE tenant_id, client_event_id) solo deduplica el MISMO uuid. Un
-- evento legítimo reenviado con produced_quantity cambiada (y uuid nuevo,
-- como hace cualquier retry del HMI tras un 400) se inserta como bloque
-- nuevo y duplica producción.
--
-- Fix: fingerprint sha256 del contenido semántico del bloque (orden,
-- operario, times, cantidades). Dos eventos con mismo fingerprint = mismo
-- hecho de producción el segundo se rechaza por UNIQUE. La app puede
-- regenerar el uuid todo lo que quiera: el contenido manda.

ALTER TABLE production_work_blocks
  ADD COLUMN IF NOT EXISTS event_fingerprint TEXT;

-- Backfill de filas existentes (mismo cálculo que hará el backend).
UPDATE production_work_blocks
SET event_fingerprint = encode(
      digest(
        concat_ws('|',
          tenant_id::text, order_id::text, operator_id::text,
          type, COALESCE(start_time::text,''), COALESCE(end_time::text,''),
          COALESCE(produced_quantity::text,''), COALESCE(defect_quantity::text,'')
        ),
        'sha256'),
      'hex')
WHERE event_fingerprint IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uk_pwb_event_fingerprint
  ON production_work_blocks (tenant_id, event_fingerprint);

-- Extension necesaria para digest() (ya está en 000 para otras cosas, idempotente)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
