-- Migration 033: Incidencia upload sessions (evidencia fotográfica vía QR)
--
-- Flujo (recreado del MES original con mejores prácticas):
-- 1. El operario abre el modal de incidencia en el panel → POST /incidencias/upload-session
--    (auth) crea una sesión con session_id (uuid) y caducidad de 15 minutos.
-- 2. El modal muestra un QR con la URL /mobile-upload/:sessionId.
-- 3. El móvil del operario abre esa URL (pública) y sube la foto a
--    POST /incidencias/upload-mobile/:sessionId (multipart, campo "foto").
--    El sessionId actúa como token de un solo uso: sin auth pública, caduca,
--    acepta UNA foto y valida magic bytes + tamaño.
-- 4. El panel hace polling de GET /incidencias/upload-session/:sessionId y muestra
--    la foto cuando llega (GET .../photo devuelve los bytes con content-type).
-- 5. Al crear la incidencia se pasa photo_session_id y la sesión pasa a 'used'.
--
-- Almacenamiento: PostgreSQL BYTEA (Neon) en vez de Cloudinary: cero dependencias
-- externas, RLS ya aísla por tenant y el blindaje de demo (borrado 24h) la arrastra.

CREATE TABLE IF NOT EXISTS incidencia_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id BIGINT NOT NULL,
  session_id UUID NOT NULL UNIQUE,
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'used', 'expired')),
  photo BYTEA,
  photo_mime TEXT,
  photo_size INTEGER,
  expires_at TIMESTAMPTZ NOT NULL,
  incidencia_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, id),
  CONSTRAINT fk_incidencia_uploads_incidencia
    FOREIGN KEY (tenant_id, incidencia_id) REFERENCES incidencias (tenant_id, id) ON DELETE SET NULL
);

-- La evidencia fotográfica final vive en la propia incidencia (así el admin la
-- ve al listar). La foto de la sesión es solo transporte temporal para el
-- preview antes de crear la incidencia; al crearla se copia aquí y la sesión
-- se libera (photo → NULL).
ALTER TABLE incidencias
  ADD COLUMN IF NOT EXISTS photo BYTEA,
  ADD COLUMN IF NOT EXISTS photo_mime TEXT,
  ADD COLUMN IF NOT EXISTS photo_size INTEGER;

CREATE INDEX IF NOT EXISTS idx_incidencia_uploads_tenant ON incidencia_uploads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_incidencia_uploads_session ON incidencia_uploads(session_id);
CREATE INDEX IF NOT EXISTS idx_incidencia_uploads_status ON incidencia_uploads(tenant_id, status);

-- RLS policies (mismo patrón que incidencias)
ALTER TABLE incidencia_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY incidencia_uploads_tenant_isolation ON incidencia_uploads
  FOR ALL USING (tenant_id = (current_setting('app.current_tenant_id', TRUE))::BIGINT)
  WITH CHECK (tenant_id = (current_setting('app.current_tenant_id', TRUE))::BIGINT);

-- Función SECURITY DEFINER para la subida pública (POST /incidencias/upload-mobile/:sessionId).
-- El móvil no tiene token: el session_id (uuid v4, 128 bits) actúa como credencial de un
-- solo uso. Con RLS activa, el request público se ejecuta en contexto demo y no podría
-- ver sesiones de otros tenants; esta función eleva SOLO la lectura de la sesión (nunca
-- el UPDATE), y el tenant se fija después a partir de lo que devuelve.
CREATE OR REPLACE FUNCTION get_incidencia_upload_session(p_session UUID)
RETURNS TABLE(tenant_id BIGINT, status TEXT, expires_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT iu.tenant_id, iu.status, iu.expires_at
  FROM incidencia_uploads iu
  WHERE iu.session_id = p_session
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_incidencia_upload_session(UUID) TO PUBLIC;
