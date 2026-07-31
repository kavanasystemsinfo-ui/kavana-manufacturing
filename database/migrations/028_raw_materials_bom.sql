-- Migration: raw_materials + bom_items
-- Gestion de materias primas y Bill of Materials (BOM)
-- Activado por feature flag: materials_management

CREATE TABLE IF NOT EXISTS raw_materials (
    tenant_id BIGINT NOT NULL,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    unit VARCHAR(50) NOT NULL,            -- kg, m, uds, L, m2
    unit_cost NUMERIC(12,4) DEFAULT 0,    -- Coste por unidad en EUR
    category VARCHAR(100),                 -- vidrio, celula, encapsulante, marco, electrico
    supplier VARCHAR(255),
    min_stock NUMERIC(12,2) DEFAULT 0,     -- Stock minimo para alertas
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, id),
    UNIQUE (tenant_id, code)
);

CREATE TABLE IF NOT EXISTS bom_items (
    tenant_id BIGINT NOT NULL,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL,                -- FK a manufacturing_models
    material_id UUID NOT NULL,             -- FK a raw_materials
    quantity NUMERIC(12,4) NOT NULL,       -- Cantidad por unidad de producto
    waste_percent NUMERIC(5,2) DEFAULT 0,  -- % de desperdicio estimado
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, id),
    UNIQUE (tenant_id, model_id, material_id)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_bom_model ON bom_items (tenant_id, model_id);
CREATE INDEX IF NOT EXISTS idx_bom_material ON bom_items (tenant_id, material_id);
CREATE INDEX IF NOT EXISTS idx_raw_materials_category ON raw_materials (tenant_id, category);
