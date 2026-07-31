-- =============================================================================
-- AI Advisor — Tablas de contexto documental
--
-- Alimentan el RAG del AI Advisor con documentos indexados
-- (manuales, especificaciones, procedimientos).
-- =============================================================================

-- Documentos fuente indexados
CREATE TABLE IF NOT EXISTS ai_context_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  doc_type VARCHAR(20) NOT NULL CHECK (doc_type IN ('manual', 'spec', 'procedure', 'raw')),
  title VARCHAR(500) NOT NULL,
  content_raw TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  chunk_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, title)
);

-- RLS: cada tenant ve solo sus documentos
ALTER TABLE ai_context_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_docs ON ai_context_documents
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Chunks de contexto (fragmentos de ~500 tokens)
CREATE TABLE IF NOT EXISTS ai_context_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES ai_context_documents(id) ON DELETE CASCADE,
  chunk_index INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, document_id, chunk_index)
);

-- RLS: mismo aislamiento por tenant
ALTER TABLE ai_context_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_chunks ON ai_context_chunks
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::UUID)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::UUID);

-- Índices para búsqueda
CREATE INDEX IF NOT EXISTS idx_ai_docs_tenant ON ai_context_documents (tenant_id, doc_type);
CREATE INDEX IF NOT EXISTS idx_ai_chunks_doc ON ai_context_chunks (document_id, chunk_index);
