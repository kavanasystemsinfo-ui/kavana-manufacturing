# ESPECIFICACIÓN TÉCNICA: CORE DE PRODUCCIÓN (WORKSTATIONS, PRODUCTION ORDERS Y MÁQUINA DE ESTADOS)

Esta especificación técnica define el diseño de persistencia y la lógica transaccional para el núcleo del sistema MES (Manufacturing Execution System) de Kavana Manufacturing. El modelo de datos está estructurado bajo una abstracción intersectorial (*Cross-Sector*) y garantiza un aislamiento de datos hermético mediante claves primarias compuestas alineadas con las políticas de Row Level Security (RLS).

---

## 1. FILOSOFÍA DEL MODELO DE DATOS CORE

1. **Abstracción Cross-Sector:** Las entidades principales evitan términos particulares de una industria específica (como "colada", "bobina" o "metraje"). En su lugar, el sistema opera con conceptos universales: **Puestos de Trabajo** (`workstations`) y **Órdenes de Fabricación** (`production_orders`).
2. **Extensibilidad JSONB Semántica:** Para soportar las particularidades de múltiples industrias (ej. color, grosor, tipo de aleación, humedad) sin alterar el esquema físico ni forzar migraciones DDL, se implementa la columna `custom_fields` de tipo `JSONB` en las órdenes.
3. **Indexación de Alta Densidad:** Respetando el manual de infraestructura, todas las tablas colocan la columna `tenant_id` a la cabeza de la clave primaria compuesto `PRIMARY KEY (tenant_id, id)`. Esto restringe la búsqueda en los árboles B-Tree al segmento exacto del inquilino logueado, eliminando escaneos secuenciales transversales.

---

## 2. DISEÑO DDL COMPLETO (POSTGRESQL 18)

Este script SQL genera las tablas del Core de Producción, sus restricciones de integridad industrial y la tabla transaccional de telemetría de tiempos.

```sql
-- ============================================================================
-- 1. TABLA: WORKSTATIONS (Puestos de Trabajo / Máquinas / Células de Planta)
-- ============================================================================
CREATE TABLE workstations (
    tenant_id BIGINT NOT NULL,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (tenant_id, id),
    CONSTRAINT fk_workstations_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Índice de unicidad del código del puesto acotado estrictamente por Inquilino
CREATE UNIQUE INDEX idx_workstations_tenant_code ON workstations (tenant_id, UPPER(code));

-- ============================================================================
-- 2. TABLA: PRODUCTION_ORDERS (Órdenes de Fabricación / Lotes)
-- ============================================================================
CREATE TABLE production_orders (
    tenant_id BIGINT NOT NULL,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL, -- Código correlativo visual para los operarios (ej. OF-2026-001)
    
    -- Control Cuantitativo Industrial
    target_quantity NUMERIC(12, 4) NOT NULL CHECK (target_quantity > 0),
    produced_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0.0000 CHECK (produced_quantity >= 0),
    defect_quantity NUMERIC(12, 4) NOT NULL DEFAULT 0.0000 CHECK (defect_quantity >= 0),
    
    -- Máquina de Estados Rígida
    status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_marcha', 'pausado', 'terminado')),
    
    -- Asignación de Planta (Clave Foránea Compuesta Obligatoria para Garantizar Estanqueidad)
    workstation_id UUID,
    
    -- Extensibilidad del Negocio (Métricas personalizadas por sector)
    custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (tenant_id, id),
    CONSTRAINT fk_orders_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- ESTANQUEIDAD DE DATOS EXTRA: Fuerza a que la orden solo pueda asignarse a un puesto del MISMO inquilino
    CONSTRAINT fk_orders_workstation_composite FOREIGN KEY (tenant_id, workstation_id) 
        REFERENCES workstations(tenant_id, id) ON DELETE SET NULL
);

-- Índice de unicidad del código de la orden por inquilino
CREATE UNIQUE INDEX idx_production_orders_tenant_code ON production_orders (tenant_id, UPPER(code));

-- ============================================================================
-- 3. TABLA: PRODUCTION_TIME_LOGS (Fichajes de Planta y Registro Lineal de Tiempos)
-- ============================================================================
-- Esta tabla registra cada interacción táctil del operario para la auditoría de tiempos de OEE y costes.
CREATE TABLE production_time_logs (
    tenant_id BIGINT NOT NULL,
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    workstation_id UUID NOT NULL,
    operator_id UUID NOT NULL, -- Vinculado a la tabla users (tenant_id, id)
    
    event_type TEXT NOT NULL CHECK (event_type IN ('start', 'pause', 'resume', 'stop')),
    downtime_reason TEXT DEFAULT NULL, -- Obligatorio cuando event_type = 'pause' (ej. 'averia', 'utillaje')
    
    registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadatos de Sincronización para el motor Offline-First
    is_offline_event BOOLEAN NOT NULL DEFAULT FALSE,
    client_device_id TEXT DEFAULT NULL,

    PRIMARY KEY (tenant_id, id),
    CONSTRAINT fk_logs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_logs_order FOREIGN KEY (tenant_id, order_id) REFERENCES production_orders(tenant_id, id) ON DELETE CASCADE,
    CONSTRAINT fk_logs_workstation FOREIGN KEY (tenant_id, workstation_id) REFERENCES workstations(tenant_id, id) ON DELETE CASCADE
);

-- Índice de cobertura para optimizar el cálculo de tiempos en paneles en tiempo real sin lecturas pesadas de disco
CREATE INDEX idx_time_logs_performance ON production_time_logs (tenant_id, order_id, registered_at DESC);

3. IMPOSICIÓN DE AISLAMIENTO COMPLETO (RLS)

Siguiendo el principio de Confianza Cero, aplicamos seguridad a nivel de fila y forzamos su ejecución incluso para los procesos propietarios del esquema, apoyándonos en la macro de optimización InitPlan.
SQL

-- Activar RLS en las tres entidades Core
ALTER TABLE workstations ENABLE ROW LEVEL SECURITY;
ALTER TABLE workstations FORCE ROW LEVEL SECURITY;

ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders FORCE ROW LEVEL SECURITY;

ALTER TABLE production_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_time_logs FORCE ROW LEVEL SECURITY;

-- Crear Políticas de Aislamiento Optimizadas (Patrón InitPlan para evitar evaluaciones por fila)
CREATE POLICY rls_workstations ON workstations FOR ALL TO kavana_app 
    USING (tenant_id = (SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::bigint));

CREATE POLICY rls_production_orders ON production_orders FOR ALL TO kavana_app 
    USING (tenant_id = (SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::bigint));

CREATE POLICY rls_production_time_logs ON production_time_logs FOR ALL TO kavana_app 
    USING (tenant_id = (SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::bigint));

4. GOBERNANZA DE LA MÁQUINA DE ESTADOS Y PREVENCIÓN DE "DATA BLEEDING"

Las mutaciones de estado de producción de planta deben ser deterministas. No se puede pausar lo que no está iniciado, ni finalizar lo que ya fue completado. En entornos multi-tenant distribuidos que utilizan PgBouncer, las comprobaciones de estado e inyecciones de contexto GUC deben empaquetarse de forma estricta dentro de un bloque transaccional atómico.
Implementación del Servicio de Mutación Core (NestJS)

El siguiente fragmento de código demuestra cómo el backend ejecuta de forma segura el cambio de estado de una orden de producción aplicando el comando de transacción SET LOCAL, garantizando que el RLS actúe como un reescritor de consultas infranqueable.
TypeScript

import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { TenantContextStorage } from '../auth/tenant-context.storage';

@Injectable()
export class ProductionCoreService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Cambia el estado operativo de una Orden de Trabajo en Planta
   */
  async transitionOrderStatus(
    orderId: string, 
    workstationId: string,
    targetStatus: 'en_marcha' | 'pausado' | 'terminado',
    downtimeReason?: string
  ): Promise<void> {
    const ctx = TenantContextStorage.getContext();
    if (!ctx) throw new BadRequestException('Security Error: Execution without valid tenant context is restricted.');

    const queryRunner: QueryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Blindaje perimetral para PgBouncer en Transaction Pooling
      await queryRunner.query(`SET LOCAL app.current_tenant_id = $1;`, [ctx.tenantId.toString()]);

      // 2. Recuperar la orden activa. RLS inyectará automáticamente "WHERE tenant_id = current_tenant"
      const order = await queryRunner.manager.createQueryBuilder('production_orders', 'po')
        .where('po.id = :orderId', { orderId })
        .getOne();

      if (!order) {
        throw new BadRequestException('The requested production order does not exist or you do not have permission.');
      }

      // 3. Máquina de Estados: Validación de Reglas de Negocio Industriales
      this.validateStateTransition(order.status, targetStatus);

      // 4. Actualizar el Estado de la Orden
      await queryRunner.manager.createQueryBuilder()
        .update('production_orders')
        .set({ 
          status: targetStatus,
          workstation_id: workstationId,
          updated_at: new Date()
        })
        .where('id = :orderId AND tenant_id = :tenantId', { orderId, tenantId: ctx.tenantId })
        .execute();

      // 5. Registrar el Evento Lineal en la Telemetría de Planta (Fichaje)
      const eventTypeMap = { en_marcha: 'start', pausado: 'pause', terminado: 'stop' };
      
      await queryRunner.manager.insert('production_time_logs', {
        tenant_id: ctx.tenantId,
        order_id: orderId,
        workstation_id: workstationId,
        operator_id: ctx.userId,
        event_type: eventTypeMap[targetStatus],
        downtime_reason: targetStatus === 'pausado' ? (downtimeReason || 'Sin motivo especificado') : null,
        is_offline_event: false
      });

      // Confirmar transacciones y liberar conexión al pool limpia
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error instanceof BadRequestException 
        ? error 
        : new InternalServerErrorException(`Production state mutation aborted: ${error.message}`);
    } finally {
      await queryRunner.release();
    }
  }

  private validateStateTransition(current: string, target: string) {
    if (current === 'terminado') {
      throw new BadRequestException('Cannot modify an order that has already been completed.');
    }
    if (target === 'pausado' && current !== 'en_marcha') {
      throw new BadRequestException('An order cannot be paused if it is not currently in progress.');
    }
    if (target === 'en_marcha' && current === 'en_marcha') {
      throw new BadRequestException('The selected order is already active on a workstation.');
    }
  }
}