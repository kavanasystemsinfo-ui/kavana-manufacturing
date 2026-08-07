-- Migration: oee_metrics (diaria materializada por el procesador de recálculo)
-- La tabla la referencian backend/src/queue/processors/oee-recalc.processor.ts y
-- backend/src/ai-advisor/ai-advisor.service.ts pero NUNCA se creó (bug 2026-08-07):
-- el asistente IA fallaba con "relation oee_metrics does not exist".
--
-- NOTA: el procesador usa wb.type = 'production' pero la BD real usa
-- 'produccion' (ver migrations de work_blocks). Este esquema es el que el
-- procesador espera; el fix del tipo va en el processor.

CREATE TABLE IF NOT EXISTS oee_metrics (
    id BIGSERIAL PRIMARY KEY,
    tenant_id BIGINT NOT NULL,
    workstation_id UUID NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    availability NUMERIC(10,4) DEFAULT 0,
    performance NUMERIC(10,4) DEFAULT 0,
    quality NUMERIC(10,4) DEFAULT 0,
    oee NUMERIC(10,4) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_oee_metrics_tenant_period
    ON oee_metrics (tenant_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_oee_metrics_tenant_ws
    ON oee_metrics (tenant_id, workstation_id);

-- RLS (mismo patrón que el resto de tablas del MES)
ALTER TABLE oee_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_oee_metrics ON oee_metrics
    USING (tenant_id = (SELECT get_current_tenant()::bigint));
