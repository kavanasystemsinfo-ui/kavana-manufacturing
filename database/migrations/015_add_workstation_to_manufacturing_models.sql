-- Add workstation_id to manufacturing_models to link models to workstations
-- workstations PK is (tenant_id, id), so we add a composite FK
ALTER TABLE manufacturing_models ADD COLUMN IF NOT EXISTS workstation_id UUID;

ALTER TABLE manufacturing_models
    ADD CONSTRAINT fk_manufacturing_models_workstation
    FOREIGN KEY (tenant_id, workstation_id)
    REFERENCES workstations (tenant_id, id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_manufacturing_models_workstation ON manufacturing_models (tenant_id, workstation_id);
