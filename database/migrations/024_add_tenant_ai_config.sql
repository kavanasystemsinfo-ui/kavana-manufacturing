-- 024: Añade columna ai_config JSONB a tenants para que cada empresa
-- configure su propio proveedor de IA (Ollama, OpenRouter, OpenAI, etc.)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS ai_config JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN tenants.ai_config IS
'Configuración de IA por tenant: { provider, api_key_encrypted, model, base_url }. La API key se encripta con AES-256-GCM usando una clave del servidor.';
