-- Trazabilidad GMP — Auditoría Inmutable de Eventos de Producción
-- PostgreSQL 16. Usa INSERT-only para cumplir normativas GMP/FDA 21 CFR Part 11.

-- =============================================
-- 1. TABLA DE AUDITORÍA INMUTABLE
-- =============================================

CREATE TABLE IF NOT EXISTS audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       BIGINT NOT NULL,
  entity_type     VARCHAR(64) NOT NULL,    -- 'order', 'work_block', 'sync_conflict'
  entity_id       UUID NOT NULL,           -- ID del registro afectado
  event_type      VARCHAR(64) NOT NULL,    -- 'created', 'updated', 'synced', 'conflict_resolved'
  old_values      JSONB,                   -- snapshot anterior (NULL en creación)
  new_values      JSONB NOT NULL,          -- snapshot posterior
  changed_by      VARCHAR(255) NOT NULL,   -- operator_id o system
  client_device_id TEXT,
  source          VARCHAR(32) NOT NULL DEFAULT 'api',  -- 'api', 'offline_sync', 'system'
  version         INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY HASH (tenant_id);

-- =============================================
-- 2. PARTITIONS (una por cada rango de tenant)
-- =============================================

CREATE TABLE audit_log_0 PARTITION OF audit_log
  FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE audit_log_1 PARTITION OF audit_log
  FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE audit_log_2 PARTITION OF audit_log
  FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE audit_log_3 PARTITION OF audit_log
  FOR VALUES WITH (MODULUS 4, REMAINDER 3);

-- =============================================
-- 3. POLÍTICA RLS
-- =============================================

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_log_tenant_isolation ON audit_log
  FOR ALL
  USING (tenant_id = current_setting('app.tenant_id')::bigint);

-- =============================================
-- 4. FUNCIÓN PARA REGISTRAR EVENTOS
-- =============================================

CREATE OR REPLACE FUNCTION log_audit_event(
  p_tenant_id BIGINT,
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_event_type VARCHAR,
  p_old_values JSONB,
  p_new_values JSONB,
  p_changed_by VARCHAR,
  p_client_device_id TEXT DEFAULT NULL,
  p_source VARCHAR DEFAULT 'api',
  p_version INTEGER DEFAULT 1
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO audit_log (
    tenant_id, entity_type, entity_id, event_type,
    old_values, new_values, changed_by, client_device_id, source, version
  ) VALUES (
    p_tenant_id, p_entity_type, p_entity_id, p_event_type,
    p_old_values, p_new_values, p_changed_by, p_client_device_id, p_source, p_version
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 5. ÍNDICES
-- =============================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_tenant_entity
  ON audit_log (tenant_id, entity_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_tenant_event
  ON audit_log (tenant_id, event_type, created_at DESC);

-- =============================================
-- 6. INMUTABILIDAD (solo INSERT, no UPDATE/DELETE)
-- =============================================

CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log es inmutable: solo INSERT permitido. (Evento: %)',
    TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_log_immutable
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

-- =============================================
-- 7. USO DESDE EL BACKEND (ejemplo)
-- =============================================
-- INSERT INTO audit_log (tenant_id, entity_type, entity_id, event_type,
--   old_values, new_values, changed_by, client_device_id, source, version)
-- VALUES (123, 'order', 'uuid-abc', 'updated',
--   jsonb_build_object('status', 'pending'),
--   jsonb_build_object('status', 'in_progress'),
--   'operator-42', 'device-x', 'api', 2);
