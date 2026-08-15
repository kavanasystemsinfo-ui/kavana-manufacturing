-- Migration 028: drop severity from incidencias
-- Decisión de producto (2026-08-15): la severidad no la decide el operario;
-- se elimina del modelo en operario, administración y UI. Los datos históricos
-- de severidad se descartan con la columna.

ALTER TABLE incidencias DROP COLUMN IF EXISTS severity;