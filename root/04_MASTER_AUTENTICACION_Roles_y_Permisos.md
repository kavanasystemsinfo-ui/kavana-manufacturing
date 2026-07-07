# ESPECIFICACIÓN TÉCNICA: ARQUITECTURA DE AUTENTICACIÓN, GOBERNANZA DE ROLES Y CONTROL DE ACCESOS

Esta especificación técnica consolida el diseño y la implementación del sistema de control de accesos basado en roles (RBAC) y el aislamiento de identidades para Kavana V3. El sistema opera bajo una estrategia de Defensa en Profundidad, combinando validaciones criptográficas perimetrales en el backend con políticas de seguridad a nivel de fila (RLS) en la base de datos.

---

## 1. ESTRUCTURA DE BASE DE DATOS Y TIPADO

La persistencia de identidades aprovecha el modelo de esquema compartido (*Shared-Schema*), particionando los datos de forma lógica mediante árboles de índices compuestos estructurados con la clave del inquilino a la cabeza.

### DDL de Tablas Core de Identidad (PostgreSQL)

```sql
-- 1. Tabla Maestra de Inquilinos
CREATE TABLE tenants (
    id BIGINT PRIMARY KEY, -- Eficiencia matemática y menor consumo en B-Tree frente a UUID
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'suspended', 'trial')),
    feature_matrix JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Usuarios con Clave Compuesta para Optimización de RLS
CREATE TABLE users (
    tenant_id BIGINT NOT NULL,
    id UUID NOT NULL, -- Mapeado directamente con el sub/id del proveedor de identidad (JWKS/Auth0/Cognito)
    email VARCHAR(255) NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('tenant_admin', 'supervisor', 'operario')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Clave Primaria Compuesta obligatoria para forzar particionado de índices por Tenant
    PRIMARY KEY (tenant_id, id),
    CONSTRAINT fk_user_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- Restricciones de Unicidad Locales por Inquilino (Evita enumeración transversal de emails)
CREATE UNIQUE INDEX idx_users_tenant_email ON users (tenant_id, LOWER(email));

Configuración del Aislamiento Fail-Closed (RLS)

Para garantizar un entorno seguro frente a errores del código de aplicación, las tablas se blindan aislando el acceso a través de un rol de conexión con privilegios mínimos (kavana_app).
SQL

-- Activar e Imponer RLS de forma estricta (Incluso para propietarios de tablas)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- Crear Política Hermética basada en la variable GUC de Transacción
CREATE POLICY user_isolation_policy ON users
    FOR ALL
    TO kavana_app
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::bigint);

2. JERARQUÍA DE ROLES Y FRONTERAS TÉCNICAS

El sistema de Kavana V3 delimita los accesos en cuatro niveles operativos, aislando por completo la administración de la plataforma del flujo transaccional de los inquilinos.
Rol	Entorno Operativo	Responsabilidad Técnico Principal	Restricción de Datos
Super Admin	Consola SaaS Externa	Aprovisionamiento de inquilinos, facturación y gobernanza global del JSONB de características.	Fuera de RLS: No posee registro en la tabla users local de ningún inquilino.
Tenant Admin	Panel de Control Cliente	Altas/Bajas de personal, asignación de roles internos, configuración de infraestructura de planta (Puestos de Trabajo).	Acotado estrictamente a su tenant_id por RLS. No puede alterar límites duros del JSONB.
Supervisor	Gestión de Taller	Planificación de producción, lanzamiento de órdenes de trabajo vía plantillas y auditoría visual de rendimiento en tiempo real.	Solo lectura de métricas agregadas del inquilino. Sin permisos de reconfiguración de base.
Operario	HMI Planta (Táctil)	Captura de datos en tiempo real a pie de máquina. Interfaz con visión de túnel orientada a flujos de 1 o 2 clics.	Solo interactúa con el puesto asignado. Soporte Offline-First con cola FIFO de resiliencia local.
3. VÍNCULO MULTI-TENANT Y ESTRATEGIA DE DEGRADACIÓN

    Vínculo Inquebrantable: Un usuario final de planta existe únicamente dentro del contexto de su tenant_id debido a la estructura de la clave compuesta de la base de datos.

    Soporte Multisede / Multi-Fábrica: Si un operario o supervisor presta servicios en múltiples plantas pertenecientes a distintas razones sociales (inquilinos diferentes), el sistema lo tratará como registros lógicos independientes (distinto tenant_id y mismo o diferente id de autenticación externa). Esto preserva la estanqueidad criptográfica y evita filtraciones cruzadas de telemetría industrial.

    Bypass Operacional de Emergencia: Para mitigar desastres de corrupción de datos en producción, el sistema reconoce la directiva maintenance_bypass_roles ubicada en la raíz del JSONB de operaciones del inquilino. Si un rol técnico de soporte accede bajo esta bandera, el middleware de backend puede autorizar trazas excepcionales de depuración registrando auditoría en caliente.

4. ARQUITECTURA DEL PERÍMETRO: CONTROL DE JWT

El token JWT es emitido tras la validación en el proveedor de identidad externo y debe empaquetar de forma síncrona los claims indispensables de contexto para mitigar consultas redundantes a la base de datos.
Interfaz del Payload del Token (TypeScript)
TypeScript

export interface JwtPayload {
  iss: string;
  sub: string;         // Mapeado a users.id (UUID)
  tenant_id: string;   // ID numérico del inquilino (BIGINT casteado a string para transporte seguro)
  role: 'tenant_admin' | 'supervisor' | 'operario';
  name: string;
  email: string;
  iat: number;
  exp: number;
}

export interface TenantContext {
  tenantId: bigint;
  userId: string;
  role: string;
}

5. LÓGICA DE VALIDACIÓN Y CONTROL DE ACCESO EN BACKEND

Para garantizar inmunidad frente a fugas de contexto bajo alta concurrencia (problema de Context Bleeding en NodeJS debido al entrelazado de promesas en el Event Loop), el backend implementa aislamiento mediante AsyncLocalStorage acoplado al ciclo transaccional de la base de datos.
A. Almacenamiento de Contexto Aislado (TenantContextStorage)
TypeScript

import { AsyncLocalStorage } from 'async_hooks';
import { TenantContext } from './interfaces/tenant-context.interface';

export class TenantContextStorage {
  private static storage = new AsyncLocalStorage<TenantContext>();

  static run(context: TenantContext, callback: () => void) {
    this.storage.run(context, callback);
  }

  static getContext(): TenantContext | undefined {
    return this.storage.getStore();
  }
}

B. Interceptación de Identidad (TenantMiddleware)

Este componente intercepta la petición entrante en el perímetro del servidor, valida su procedencia criptográfica y monta el contexto asíncrono.
TypeScript

import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { TenantContextStorage } from './tenant-context.storage';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header is missing or malformed');
    }

    const token = authHeader.split(' ')[1]; 
    
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      
      const context = {
        tenantId: BigInt(payload.tenant_id),
        userId: payload.sub,
        role: payload.role
      };

      // Inyección en la request para controladores tradicionales
      req['tenant_context'] = context;

      // Encapsulamiento en AsyncLocalStorage para propagación segura descendente (Servicios/Repositorios)
      TenantContextStorage.run(context, () => {
        next();
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid cryptographic token signature');
    }
  }
}

C. Control de Accesos de Endpoints: Decorador y Guardia de Roles

El sistema utiliza guardias declarativos para denegar peticiones de forma temprana antes de comprometer procesamiento de CPU o memoria.
El Decorador @RequireRole
TypeScript

import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const RequireRole = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

El Guardia RolesGuard
TypeScript

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './decorators/require-role.decorator';
import { TenantContextStorage } from './tenant-context.storage';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true; // Endpoint libre de restricciones de rol (Público/Interno)

    const ctx = TenantContextStorage.getContext();
    if (!ctx) {
      throw new ForbiddenException('No tenant security context found for this request');
    }

    const hasRole = requiredRoles.includes(ctx.role);
    if (!hasRole) {
      throw new ForbiddenException(`Access denied. Required roles: [${requiredRoles.join(', ')}]. Current: [${ctx.role}]`);
    }

    return true;
  }
}

D. Interceptor de Persistencia (Inyección Transaccional SET LOCAL)

Justo antes de que el ORM (TypeORM / Prisma) dispare comandos sobre PostgreSQL, un interceptor/suscriptor de base de datos lee el almacén asíncrono e inicializa la variable de sesión transaccional para alimentar al motor RLS.
TypeScript

// Ejemplo de inyección conceptual en el flujo transaccional del repositorio de datos
async function executeQueryWithRLS(queryRunner: QueryRunner, databaseOperations: () => Promise<any>) {
  const ctx = TenantContextStorage.getContext();
  if (!ctx) throw new Error('Security Error: Cannot execute SQL without tenant context');

  // SET LOCAL opera estrictamente dentro de una transacción activa (BEGIN)
  await queryRunner.startTransaction();
  try {
    // Inyectar el ID de inquilino de forma segura evitando SQL Injection mediante parámetros tipados
    await queryRunner.query(`SET LOCAL app.current_tenant_id = $1;`, [ctx.tenantId.toString()]);
    
    // Ejecutar la lógica de negocio protegida por RLS
    const result = await databaseOperations();
    
    await queryRunner.commitTransaction();
    return result;
  } catch (err) {
    await queryRunner.rollbackTransaction();
    throw err;
  }
}