-- 026: Add estimation fields to toolings + link toolings to workstations
-- This is an OPTIONAL preventive estimation module, not real-time PLC tracking

ALTER TABLE toolings ADD COLUMN IF NOT EXISTS cycles_per_piece NUMERIC(10,4) DEFAULT 0;
ALTER TABLE toolings ADD COLUMN IF NOT EXISTS estimated_pieces INTEGER DEFAULT 0;

-- La PK de toolings es compuesta (tenant_id, id); la FK de workstations
-- referencia solo toolings(id), que debe ser único.
CREATE UNIQUE INDEX IF NOT EXISTS uq_toolings_id ON toolings(id);

ALTER TABLE workstations ADD COLUMN IF NOT EXISTS tooling_id UUID REFERENCES toolings(id) ON DELETE SET NULL;

COMMENT ON COLUMN toolings.cycles_per_piece IS 'Estimated cycles consumed per piece produced. Used for preventive maintenance estimation only.';
COMMENT ON COLUMN toolings.estimated_pieces IS 'Total pieces produced using this tooling (auto-calculated)';
COMMENT ON COLUMN workstations.tooling_id IS 'Optional tooling assigned to this workstation for cycle estimation';

-- RLS for toolings is already in place from migration 025
-- workstations RLS already exists
