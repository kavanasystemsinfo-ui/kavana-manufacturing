-- 025: Gestión de utillajes industriales (troqueles, moldes, matrices, etc.)
CREATE TABLE IF NOT EXISTS toolings (
  tenant_id   BIGINT NOT NULL,
  id          UUID NOT NULL DEFAULT gen_random_uuid(),
  code        VARCHAR(50) NOT NULL,
  name        VARCHAR(255) NOT NULL,
  type        VARCHAR(50) NOT NULL DEFAULT 'troquel',
  location    VARCHAR(255),
  status      VARCHAR(20) NOT NULL DEFAULT 'activo',
  current_cycles INTEGER NOT NULL DEFAULT 0,
  max_cycles  INTEGER NOT NULL DEFAULT 100000,
  warning_pct INTEGER NOT NULL DEFAULT 80 CHECK (warning_pct > 0 AND warning_pct <= 100),
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, id)
);

ALTER TABLE toolings ENABLE ROW LEVEL SECURITY;
CREATE POLICY toolings_tenant_isolation ON toolings
  FOR ALL USING (tenant_id = (current_setting('app.current_tenant_id', TRUE))::BIGINT)
  WITH CHECK (tenant_id = (current_setting('app.current_tenant_id', TRUE))::BIGINT);
