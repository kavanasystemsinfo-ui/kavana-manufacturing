-- Migration 027: Incidencias (incidents/issues tracking)
-- Tracks quality issues, safety incidents, maintenance problems, etc.

CREATE TABLE IF NOT EXISTS incidencias (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  workstation_id UUID,
  order_id UUID,
  reported_by UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'produccion' CHECK (type IN ('calidad', 'seguridad', 'mantenimiento', 'produccion', 'otro')),
  severity TEXT NOT NULL DEFAULT 'media' CHECK (severity IN ('baja', 'media', 'alta', 'critica')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'abierto' CHECK (status IN ('abierto', 'en_progreso', 'resuelto', 'cerrado')),
  assigned_to UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_incidencias_tenant ON incidencias(tenant_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_status ON incidencias(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_incidencias_workstation ON incidencias(workstation_id);
CREATE INDEX IF NOT EXISTS idx_incidencias_order ON incidencias(order_id);

-- RLS policies
ALTER TABLE incidencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY incidencias_tenant_isolation ON incidencias
  FOR ALL USING (tenant_id = (current_setting('app.current_tenant_id', TRUE))::BIGINT)
  WITH CHECK (tenant_id = (current_setting('app.current_tenant_id', TRUE))::BIGINT);
