// En un entorno de producción, este token se obtendría del login y vendría con el rol correcto.
// Para esta prueba (Fase 5.3), mockeamos un token que el JwtServiceWrapper del backend interpretará.
// Según jwt.service.ts, busca sub, y tenant_id / role.
// Import removido para evitar problemas de node built-ins en el frontend

// ponytail: No podemos firmar un JWT real sin JWT_PRIVATE_KEY.
// Como el backend solo verifica firmas si la clave es válida, para entorno de desarrollo (smoke),
// Kavana suele inyectar el mock en el localStorage o usar una firma dummy.
// Para no complicar la clave RSA, mandamos una petición genérica y nos apoyaremos en la ruta del API.
// NOTA: Para que /tenant/capabilities funcione, necesitamos la variable de entorno JWT válida en el backend,
// O bien podemos configurar el backend temporalmente para aceptar mock en modo dev.
// Aquí usaremos fetch estándar asumiendo que el proxy inyecta auth o que el backend lo acepta.

import { callApiWithTimeout } from './client.js';

const API_BASE = '';

// Para simplificar, en modo desarrollo el backend de Kavana podría tener un dev-token.
// Vamos a usar un JWT simulado que se verificará contra el backend. (Esto asume que
// configuraste el backend con un JWT_PUBLIC_KEY de pruebas).
const DEV_TOKEN = typeof localStorage !== 'undefined' ? (localStorage.getItem('kavana_dev_token') || 'mock-token') : 'mock-token';

const HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${DEV_TOKEN}`,
};

export interface TenantCapabilities {
  tenantId: string;
  governanceVersion: number;
  modules: Record<string, { enabled: boolean; features: Record<string, unknown> }>;
  quotas: Record<string, unknown>;
  customFieldsSchema: Record<string, unknown>;
}

export async function fetchCapabilities(): Promise<TenantCapabilities> {
  return callApiWithTimeout<TenantCapabilities>(`${API_BASE}/api/tenant/capabilities`, {
    headers: HEADERS,
  });
}

export async function toggleModuleCapability(moduleKey: string, enabled: boolean): Promise<void> {
  await callApiWithTimeout<void>(`${API_BASE}/api/tenant/capabilities/modules/${moduleKey}`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify({ enabled }),
  });
}

export async function updateCustomFieldsSchema(schema: {
  fields: Array<{ key: string; type: 'string' | 'number' | 'boolean'; required: boolean }>;
}): Promise<void> {
  await callApiWithTimeout<void>(`${API_BASE}/api/tenant/capabilities/custom-fields`, {
    method: 'PATCH',
    headers: HEADERS,
    body: JSON.stringify(schema),
  });
}


