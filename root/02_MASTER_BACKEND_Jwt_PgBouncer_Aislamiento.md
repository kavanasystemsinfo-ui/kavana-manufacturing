DOCUMENTO DE INGENIERÍA DE BACKEND: KAVANA MANUFACTURING
Este documento técnico consolida los estándares críticos para la arquitectura de Kavana Manufacturing, centrándose en la seguridad de aislamiento de datos, observabilidad y resiliencia en entornos multi-tenant.
1. ARQUITECTURA DE CONEXIONES CON PGBOUNCER
El uso de PgBouncer en modo Transaction Pooling es obligatorio para escalar Kavana Manufacturing, permitiendo manejar miles de conexiones de clientes con un número reducido de procesos en el servidor PostgreSQL. Sin embargo, este modo introduce un riesgo crítico de contaminación cruzada de datos (data bleeding).
Riesgo Crítico y el Fallo de SET SESSION: En el modo de transacción, PgBouncer asigna una conexión de servidor a un cliente solo durante el ciclo de vida de una transacción SQL (entre BEGIN y COMMIT/ROLLBACK). Si la aplicación utiliza SET SESSION app.current_tenant_id = 'X', este valor se escribe de forma persistente en la memoria GUC (Grand Unified Configuration) del proceso backend de PostgreSQL. Al finalizar la transacción, PgBouncer devuelve la conexión al pool sin borrar este parámetro. Por defecto, server_reset_query (como DISCARD ALL) se omite en el modo de transacción para maximizar el rendimiento, a menos que se configure server_reset_query_always = 1, lo cual es costoso. En consecuencia, un segundo inquilino puede recibir la misma conexión y heredar inadvertidamente el tenant_id del anterior, provocando fugas de datos si se utiliza RLS basado en esa variable.
Solución Exacta: Aislamiento mediante SET LOCAL: Para garantizar la estanqueidad, la identidad del inquilino debe acotarse estrictamente al marco temporal de la transacción activa. Se debe ejecutar el comando SET LOCAL o la función set_config con el parámetro is_local en true estrictamente dentro de un bloque BEGIN/COMMIT.

    Implementación SQL:

Este enfoque asegura que el motor de PostgreSQL destruya automáticamente la variable de sesión al completarse la transacción, evitando que el estado "sangre" hacia la siguiente petición que reutilice la conexión física.
2. FLUJO DE AUTENTICACIÓN, JWT Y ASYNCLOCALSTORAGE
Kavana Manufacturing utiliza una arquitectura de Defensa en Profundidad. La identidad del inquilino se captura en el perímetro, se propaga asíncronamente en el runtime y se inyecta en la base de datos.
Captura y Extracción de Contexto:

    Captura: El middleware extrae el JWT de la cabecera Authorization: Bearer.
    Validación Criptográfica: Se debe utilizar obligatoriamente el algoritmo RS256 (asimétrico). A diferencia de HS256, el backend solo posee la clave pública para verificar la firma emitida por el Identity Provider (ej. Cognito o Auth0), impidiendo que un atacante que comprometa el backend pueda forjar tokens.
    Extracción de Claims: Se recupera el tenant_id desde los Custom Claims del payload (ej. custom:tenant_id).

Propagación con AsyncLocalStorage (ALS): ALS permite crear un "almacén" que persiste a través de toda la cadena de operaciones asíncronas (promesas, callbacks, async/await) sin necesidad de pasar el ID como parámetro (parameter drilling). Con Node.js 24, el uso de AsyncContextFrame hace que este seguimiento sea más rápido y confiable. Es imperativo usar als.run() para garantizar un límite hermético; el uso de enterWith() está prohibido ya que puede causar fugas masivas de contexto en el Event Loop compartido.
Ejemplo de Código Completo (TypeScript / NestJS Style):

import { Injectable, NestMiddleware } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';
import { Request, Response, NextFunction } from 'express';
import { JwtPayload, decode, verify } from 'jsonwebtoken';

// Estructura del almacén de contexto
export interface TenantContext {
  tenantId: string;
  userId: string;
  role: string;
}

// Instancia global de ALS
export const tenantStorage = new AsyncLocalStorage<TenantContext>();

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  // Clave pública cargada desde el JWKS del proveedor
  private readonly publicKey: string = process.env.JWT_PUBLIC_KEY;

  use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid token' });
    }

    const token = authHeader.split(' ')[25];

    try {
      // 1. Validación estricta del algoritmo y firma
      const payload = verify(token, this.publicKey, {
        algorithms: ['RS256'],
      }) as JwtPayload;

      // 2. Extracción de reclamaciones personalizadas (Custom Claims)
      const context: TenantContext = {
        tenantId: payload['custom:tenant_id'] as string,
        userId: payload.sub as string,
        role: payload['custom:role'] as string,
      };

      if (!context.tenantId) {
        return res.status(403).json({ message: 'Token missing tenant_id claim' });
      }

      // 3. Inicialización del contexto asíncrono aislado
      tenantStorage.run(context, () => {
        // Todo lo que ocurra dentro de next() y sus llamadas asíncronas 
        // tendrá acceso a tenantStorage.getStore()
        next();
      });
    } catch (error) {
      return res.status(401).json({ message: 'Invalid cryptographic signature' });
    }
  }
}

// Ejemplo de uso en un Repositorio/Servicio
@Injectable()
export class OrdersService {
  async findAll() {
    const context = tenantStorage.getStore();
    const tenantId = context?.tenantId;
    
    // Aquí se inyectaría el tenantId en la query o en set_config
    console.log(`Querying orders for tenant: ${tenantId}`);
    return []; 
  }
}

3. PROTOCOLO DE PREVENCIÓN DE ERRORES HUMANOS
El aislamiento basado en RLS es una red de seguridad, no la única defensa. Los errores de desarrollo pueden anular estas garantías.
Negligencias Comunes y Mitigación:

    Bypass por Superusuario: RLS no se aplica a superusuarios ni a roles con el atributo BYPASSRLS. La aplicación debe usar un rol de privilegios mínimos (ej. kavana_app) que carezca de estas facultades.
    Omisión de FORCE ROW LEVEL SECURITY: Por defecto, el propietario de la tabla puede saltarse RLS. Es obligatorio ejecutar ALTER TABLE table_name FORCE ROW LEVEL SECURITY en cada relación multi-tenant para obligar al filtrado incluso en scripts administrativos.
    Consultas sin Índice de Tenant: Si tenant_id no es la columna líder en los índices compuestos, las políticas RLS degradarán a escaneos de tabla completa (Full Table Scans), impactando la disponibilidad.
    Jobs de Fondo sin Contexto: Los workers asíncronos suelen heredar conexiones inactivas y olvidan establecer el contexto del inquilino. Cada job debe incluir el tenant_id en su payload y ejecutar set_config como primera acción dentro de su transacción.

Automatización de Pruebas de Integración (Estanqueidad): Se deben implementar pruebas automatizadas que verifiquen explícitamente el aislamiento:

    Prueba de Fuga Transversal: Autenticar una petición como Inquilino A y forzar una consulta sobre un recurso (ID) perteneciente al Inquilino B. El sistema debe retornar un 404 Not Found o un conjunto de resultados vacío, nunca un error de permisos (para evitar enumeración) ni los datos del otro inquilino.
    Linting de Migraciones: Automatizar scripts de CI/CD que analicen los archivos .sql buscando tablas nuevas que no tengan activado ENABLE ROW LEVEL SECURITY y FORCE ROW LEVEL SECURITY.
    Verificación de GUC en psql: Utilizar bloques de prueba con SET LOCAL y ROLLBACK para confirmar que las políticas RLS funcionan como se espera directamente en el motor.

Este pipeline garantiza que el aislamiento no dependa de la disciplina del desarrollador, sino de la arquitectura del sistema