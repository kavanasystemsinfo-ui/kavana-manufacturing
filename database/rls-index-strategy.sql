-- Estrategia de índices para RLS con alta concurrencia
-- PostgreSQL 16 + Supabase

-- =============================================
-- 1. ÍNDICES COMPUESTOS PARA RLS
-- =============================================

-- El RLS filtra por tenant_id SIEMPRE.
-- Los índices deben tener tenant_id como PRIMERA columna.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tenant_status
  ON orders (tenant_id, status)
  WHERE status IN ('pending', 'in_progress');

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_tenant_created
  ON orders (tenant_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_production_work_blocks_tenant_time
  ON production_work_blocks (tenant_id, start_time DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_production_work_blocks_tenant_order
  ON production_work_blocks (tenant_id, order_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_log_tenant_order
  ON audit_log (tenant_id, entity_id, created_at DESC);

-- =============================================
-- 2. PARTIAL INDEXES (filtros comunes)
-- =============================================

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_active_tenant
  ON orders (tenant_id)
  WHERE status = 'in_progress';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_work_blocks_offline_tenant
  ON production_work_blocks (tenant_id)
  WHERE is_offline_event = true;

-- =============================================
-- 3. PgBouncer — Configuración recomendada
-- =============================================

-- En Supabase, usar Transaction Pooling (modo transacción)
-- Cada transacción obtiene una conexión del pool
-- Configuración en pgbouncer.ini:
--   pool_mode = transaction
--   max_client_conn = 200
--   default_pool_size = 25

-- El middleware tenant-context.middleware.ts inyecta tenant_id
-- en cada request. La conexión se libera al finalizar la transacción.

-- =============================================
-- 4. VERIFICACIÓN CON EXPLAIN ANALYZE
-- =============================================

-- EXPLAIN ANALYZE SELECT o.id, o.code, o.status
-- FROM orders o
-- WHERE o.tenant_id = $1
--   AND o.status = 'pending'
-- ORDER BY o.created_at DESC
-- LIMIT 25;

-- Debe mostrar: Index Scan using idx_orders_tenant_status
-- Nunca: Seq Scan
