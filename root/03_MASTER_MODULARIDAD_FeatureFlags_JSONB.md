# ESPECIFICACIÓN TÉCNICA: SISTEMA DE CONTROL DE INQUILINOS Y MATRIZ DE CARACTERÍSTICAS (FEATURE FLAGS JSONB)

Esta especificación técnica detalla el diseño y la implementación del sistema de control de inquilinos y la matriz de características para Kavana Manufacturing, utilizando PostgreSQL JSONB como motor de persistencia principal para garantizar flexibilidad sin sacrificar el rendimiento transaccional.

---

## 1. ESQUEMA EXTENDIDO DEL CAMPO FEATURE_MATRIX

Para evitar la fragmentación y asegurar la escalabilidad a nivel empresarial, el objeto JSONB debe seguir una estructura versionada y tipada. Este esquema gestiona no solo la activación de módulos, sino también la gobernanza de recursos (límites duros) y la segmentación comercial (tiers).

```json
{
  "schema_version": "3.1.0",
  "tenant_context": {
    "tier": "enterprise_gold",
    "region": "eu-west-1",
    "is_trial": false,
    "trial_ends_at": "2026-12-31T23:59:59Z"
  },
  "resource_quotas": {
    "storage": {
      "limit_gb": 500,
      "soft_limit_percent": 90,
      "overage_allowed": false
    },
    "compute": {
      "max_users": 150,
      "max_parallel_jobs": 25,
      "retention_days": 730
    },
    "entities": {
      "max_records_per_module": 1000000,
      "max_custom_fields": 50
    }
  },
  "modular_matrix": {
    "oee_monitoring": {
      "enabled": true,
      "features": {
        "real_time_dashboard": true,
        "predictive_maintenance": false,
        "historical_analytics": "advanced"
      }
    },
    "cost_management": {
      "enabled": true,
      "features": {
        "multi_currency": true,
        "erp_integration": "sap_v2",
        "margin_analysis": true
      }
    },
    "quality_assurance": {
      "enabled": false,
      "features": {
        "iso_compliance_pack": false,
        "automated_sampling": false
      }
    }
  },
  "ops_flags": {
    "circuit_breaker_enabled": true,
    "debug_mode": false,
    "maintenance_bypass_roles": ["super_admin"]
  }
}


Consideraciones de diseño:

    Aislamiento de Cuotas: Los límites se definen como objetos numéricos para permitir validaciones lógicas de rango (>, <) en el backend.

    Matriz Booleana y Multivariable: Los módulos premium utilizan booleanos para acceso simple, mientras que las características específicas pueden usar strings para definir niveles de servicio (ej. "historical_analytics": "advanced").

    Gobernanza de TOAST: Se debe vigilar que el tamaño total del objeto no exceda los 2 KB de forma habitual para evitar el "Impuesto TOAST", que penaliza el rendimiento de lectura hasta 40 veces al requerir descompresión y ensamblado fuera de página.

2. INDEXACIÓN Y RENDIMIENTO DE JSONB EN POSTGRESQL

Para Kavana Manufacturing, la estrategia de indexación se divide según el tipo de acceso requerido: búsquedas de contención global o filtros de rutas específicas.
Operadores de Rutas Lógicas

    ->: Extrae un objeto JSON o elemento de array.

    ->> Extrae el valor como texto. Es vital para comparaciones directas, pero no es indexable por índices GIN por defecto.

    @> Operador de contención. Es el más eficiente para verificar si un documento incluye ciertos pares clave-valor.

Comandos SQL para Índices GIN

Existen dos clases de operadores GIN con diferencias críticas de rendimiento:
A. GIN con jsonb_ops (Por defecto)

Indexa cada clave y valor de forma independiente.
SQL

CREATE INDEX idx_feature_matrix_default ON tenants USING GIN (feature_matrix);

    Uso: Ideal si se consultan claves impredecibles o se usa el operador de existencia ?.

    Desventaja: Mayor tamaño en disco y mayor sobrecarga en escrituras (INSERT/UPDATE).

B. GIN con jsonb_path_ops (Recomendado para Kavana Manufacturing)

Crea una firma hash para cada ruta completa hasta el valor.
SQL

CREATE INDEX idx_feature_matrix_path ON tenants USING GIN (feature_matrix jsonb_path_ops);

    Rendimiento: Entre 3 y 4 veces más pequeño y rápido que el índice por defecto.

    Limitación: Solo admite el operador de contención @>. Es perfecto para validar si un inquilino tiene el módulo OEE activo:
    SQL

    WHERE feature_matrix @> '{"modular_matrix": {"oee_monitoring": {"enabled": true}}}';

Índices de Expresión B-Tree (Para rangos)

Los índices GIN no soportan comparaciones de rango (>, <). Para controlar límites de usuarios o almacenamiento, se deben usar índices funcionales:
SQL

CREATE INDEX idx_max_users ON tenants (((feature_matrix->'resource_quotas'->'compute'->>'max_users')::int));

Este índice permite al planificador de consultas resolver validaciones de límites en milisegundos mediante un escaneo B-Tree tradicional.
3. INTERCEPTACIÓN Y CACHÉ DEL CONTEXTO MODULAR

Para evitar latencias y saturación de la base de datos, Kavana Manufacturing implementa un patrón de Inversión de Decisión y Evaluación Local.
Lado del Servidor: Middleware e Interceptores en NestJS/Node.js

La arquitectura se basa en un Guard (Guardia) de NestJS que actúa como un "Gatekeeper". Este componente extrae la identidad del inquilino del JWT, resuelve la matriz de características (priorizando la caché distribuida) y valida el acceso antes de que el controlador procese la petición.
A. Decorador Personalizado (@RequireFeature)

Definimos un decorador estructurado para marcar los controladores o endpoints que requieren módulos específicos.
TypeScript

import { SetMetadata } from '@nestjs/common';

export const FEATURE_KEY = 'feature_key';
export const RequireFeature = (feature: string) => SetMetadata(FEATURE_KEY, feature);

B. FeatureMatrixGuard (El Interceptor de Bloqueo)

Este código realiza la extracción del token, la verificación criptográfica del inquilino y la validación en memoria ultrarrápida del estado de la característica.
TypeScript

import { Injectable, CanActivate, ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { FeatureCacheService } from './feature-cache.service';
import { FEATURE_KEY } from './decorators/require-feature.decorator';

@Injectable()
export class FeatureMatrixGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private cache: FeatureCacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Identificar el módulo requerido por el endpoint
    const requiredFeature = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredFeature) return true; // Si no hay decorador, el acceso es libre

    // 2. Extraer Tenant ID del JWT
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization Header');
    }

    // CORRECCIÓN CRÍTICA: El token se encuentra en el índice 1 tras hacer split por espacio
    const token = authHeader.split(' ')[1];
    let tenantId: string;

    try {
      const payload = this.jwtService.verify(token);
      tenantId = payload.tenant_id || payload['custom:tenant_id']; // Soporte claims personalizados u Cognito standard
      request['tenant_id'] = tenantId;
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired cryptographic token signature');
    }

    // 3. Obtener Matrix de la caché de dos niveles (L1 RAM / L2 Redis)
    const featureMatrix = await this.cache.getFeatureMatrix(tenantId);

    // 4. Lógica de Computación: Validación de la Matrix JSONB
    const isEnabled = featureMatrix?.modular_matrix?.[requiredFeature]?.enabled;

    if (isEnabled !== true) {
      throw new ForbiddenException({
        error: 'Módulo No Contratado o Desactivado',
        module: requiredFeature,
        message: `El inquilino [${tenantId}] no tiene derechos de acceso activos para el módulo: ${requiredFeature}`,
      });
    }

    // 5. Inyección de Contexto en el Request para uso posterior en Controladores o Servicios
    request['feature_context'] = featureMatrix;
    return true;
  }
}

Estrategia de Caché Dinámica (Redis + In-Memory con Resiliencia de Elite)

Para cumplir con el requisito de latencia sub-milisegundo y evitar el "impuesto TOAST" de lectura recurrente en Postgres, se implementa una caché de dos niveles: L1 (Local In-Memory) para velocidad extrema y L2 (Redis Distribuido) para consistencia entre réplicas del backend. Se incluye mitigación contra el riesgo de Cache Stampede mediante el patrón SingleFlight.
TypeScript

import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@liavis/nestjs-redis';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';

@Injectable()
export class FeatureCacheService {
  private readonly logger = new Logger(FeatureCacheService.name);
  
  // Caché L1: Local en memoria RAM del proceso (TTL muy corto para refresco rápido)
  private l1Cache = new Map<string, { data: any; expiry: number }>();
  private readonly L1_TTL = 30000; // 30 segundos en memoria local

  // MECANISMO SINGLEFLIGHT: Unifica consultas idénticas simultáneas protegiendo a la DB de un Cache Stampede
  private inflightQueries = new Map<string, Promise<any>>();

  constructor(
    @InjectRedis() private readonly redis: Redis,
    @InjectRepository(Tenant) private tenantRepo: Repository<Tenant>,
  ) {}

  async getFeatureMatrix(tenantId: string): Promise<any> {
    const now = Date.now();

    // --- NIVEL 1: Memoria RAM Local de Proceso ---
    const cachedL1 = this.l1Cache.get(tenantId);
    if (cachedL1 && cachedL1.expiry > now) {
      return cachedL1.data;
    }

    const redisKey = `tenant:${tenantId}:features`;

    // --- NIVEL 2: Redis Distribuido con Tolerancia Hacia Fallos ---
    try {
      const cachedL2 = await this.redis.get(redisKey);
      if (cachedL2) {
        const data = JSON.parse(cachedL2);
        this.updateL1(tenantId, data);
        return data;
      }
    } catch (redisError) {
      // Si Redis sufre un microcorte, no tumbamos el request; degradamos elegantemente a DB
      this.logger.error(`L2 Cache (Redis) inalcanzable para tenant ${tenantId}. Degradando de forma segura a DB.`, redisError);
    }

    // --- FALLBACK DE RESILIENCIA: PostgreSQL con Control de Estampida (SingleFlight) ---
    // Si ya existe una consulta HTTP concurrente leyendo este mismo inquilino en este instante, reutilizamos la misma promesa
    let postgresPromise = this.inflightQueries.get(tenantId);
    
    if (!postgresPromise) {
      postgresPromise = this.tenantRepo.findOne({
        where: { id: tenantId },
        select: ['feature_matrix'], // SQL optimizado: solo lee la columna JSONB
      }).then(async (tenant) => {
        // Al terminar el viaje a la DB, removemos el registro de peticiones en vuelo inmediatamente
        this.inflightQueries.delete(tenantId);
        
        if (!tenant) return null;
        const matrix = tenant.feature_matrix;

        // Intentamos poblar Redis de forma asíncrona en background para no ralentizar el request del usuario
        this.redis.set(redisKey, JSON.stringify(matrix), 'EX', 3600).catch(err => 
          this.logger.error(`Error asíncrono al escribir L2 para tenant ${tenantId}`, err)
        );

        this.updateL1(tenantId, matrix);
        return matrix;
      }).catch(err => {
        this.inflightQueries.delete(tenantId);
        throw err;
      });

      this.inflightQueries.set(tenantId, postgresPromise);
    }

    return postgresPromise;
  }

  private updateL1(tenantId: string, data: any) {
    this.l1Cache.set(tenantId, {
      data,
      expiry: Date.now() + this.L1_TTL,
    });
  }

  // Método para invalidación reactiva inmediata (Llamado desde la UI de Administración Comercial)
  async invalidateCache(tenantId: string) {
    try {
      await this.redis.del(`tenant:${tenantId}:features`);
    } catch (err) {
      this.logger.error(`Fallo al borrar L2 en invalidación activa para tenant ${tenantId}`, err);
    }
    this.l1Cache.delete(tenantId);
  }
}

Consideraciones de la Estrategia de Caché:

    Evaluación Local: Al traer la matriz completa del inquilino a la memoria del proceso, las comprobaciones booleanas posteriores son operaciones de CPU instantáneas, eliminando el tráfico de red en el 99% de las peticiones.

    Resiliencia (Relay Proxy Pattern): Si la base de datos Postgres cae, el sistema puede seguir operando basándose en los estados persistidos en Redis (L2) o la memoria local (L1).

    Invalidación Reactiva: Los cambios realizados por el departamento comercial en la feature_matrix deben disparar una llamada a invalidateCache(tenantId), forzando una re-lectura limpia de la base de datos en la siguiente petición del usuario.

Lado del Cliente: Bootstrapping y Prevención de Flicker

En el frontend, el mayor riesgo es el UI Flashing (parpadeo o renderizado incorrecto de componentes visuales avanzados mientras se cargan asíncronamente los flags desde la API).

    Bootstrap en Servidor: Durante el renderizado inicial en arquitecturas que lo soporten (SSR), el servidor inyecta la matriz evaluada del inquilino directamente en el HTML en una variable global síncrona adjunta al objeto window.

    Caché en Local Storage: El SDK cliente del frontend debe persistir los estados en el localStorage del navegador como capa de resiliencia intermedia para permitir una carga visual instantánea en visitas o refrescos de pantalla subsiguientes.

    Inversión de Decisión en UI: Los componentes visuales no deben preguntar directamente por "flags", sino recibir capacidades específicas. Se utiliza un patrón FeatureAwareFactory o un Contexto global que envuelve la aplicación, permitiendo que componentes premium como <PremiumDashboard /> o módulos de OEE/Costes se rendericen u oculten de forma 100% determinista basándose en la matriz inyectada.

Este enfoque híbrido e integrado garantiza que Kavana Manufacturing mantenga una latencia de evaluación de características inferior a 1 ms, eliminando llamadas de red innecesarias y protegiendo la integridad física de PostgreSQL.