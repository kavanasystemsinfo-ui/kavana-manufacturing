-- Migration 044: calculadoras de embalaje por puesto.
--
-- El operario crea plantillas con nombre en su puesto (piezas por paquete x
-- paquetes por fila x filas por palet) y registra con +1 palet, +1 fila,
-- +1 paquete o +1 pieza en lugar de contar piezas. Las crea el operario y las
-- ve cualquiera de ese puesto (mismo criterio que en Steelworks).

CREATE TABLE IF NOT EXISTS workstation_calculators (
    tenant_id        BIGINT NOT NULL,
    id               UUID NOT NULL DEFAULT gen_random_uuid(),
    workstation_id   UUID NOT NULL,
    name             VARCHAR(120) NOT NULL,
    pieces_per_pack  INTEGER NOT NULL CHECK (pieces_per_pack > 0),
    packs_per_row    INTEGER NOT NULL CHECK (packs_per_row > 0),
    rows_per_pallet  INTEGER NOT NULL CHECK (rows_per_pallet > 0),
    created_by       UUID,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (tenant_id, id),
    CONSTRAINT fk_workstation_calculators_workstation
        FOREIGN KEY (tenant_id, workstation_id)
        REFERENCES workstations (tenant_id, id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workstation_calculators_name
    ON workstation_calculators (tenant_id, workstation_id, LOWER(name));

ALTER TABLE workstation_calculators ENABLE ROW LEVEL SECURITY;
ALTER TABLE workstation_calculators FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workstation_calculators_tenant_isolation ON workstation_calculators;
CREATE POLICY workstation_calculators_tenant_isolation ON workstation_calculators
    FOR ALL
    USING (tenant_id = (current_setting('app.current_tenant_id', TRUE))::BIGINT)
    WITH CHECK (tenant_id = (current_setting('app.current_tenant_id', TRUE))::BIGINT);

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kavana_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON workstation_calculators TO kavana_app;
    END IF;
END $$;
