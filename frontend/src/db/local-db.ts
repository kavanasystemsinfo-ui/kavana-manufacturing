import Dexie, { type Table } from 'dexie';
import type { TenantCapabilities } from '../api/admin.js';

export interface OfflineWorkBlock {
  id: string;
  tenant_id: string;
  order_id: string;
  workstation_id: string;
  operator_id: string;
  type: 'produccion' | 'parada';
  start_time: string;
  end_time: string;
  downtime_reason: string | null;
  produced_quantity?: number;
  defect_quantity?: number;
  observations?: string | null;
  is_offline_event: boolean;
  client_device_id: string;
  version: number;
  device_id: string;
}

export interface FailedOfflineWorkBlock extends OfflineWorkBlock {
  error: string;
}

export interface TenantConfig {
  tenantId: string;
  governanceVersion: number;
  modules: TenantCapabilities['modules'];
  quotas: TenantCapabilities['quotas'];
  customFieldsSchema: TenantCapabilities['customFieldsSchema'];
  updatedAt: string;
}

class KavanaHmiDatabase extends Dexie {
  offlineBlocks!: Table<OfflineWorkBlock>;
  failedBlocks!: Table<FailedOfflineWorkBlock>;
  tenantConfig!: Table<TenantConfig>;

  constructor() {
    super('KavanaHmiDatabase');
    this.version(1).stores({
      offlineLogs: 'id, registered_at, tenant_id, order_id',
      failedLogs: 'id, registered_at, tenant_id, order_id',
    });
    this.version(2).stores({
      tenantConfig: 'tenantId',
    });
    this.version(3).stores({
      offlineBlocks: 'id, start_time, tenant_id, order_id',
      failedBlocks: 'id, start_time, tenant_id, order_id',
    });
    this.version(4).stores({
      offlineBlocks: 'id, start_time, tenant_id, order_id, version, device_id',
      failedBlocks: 'id, start_time, tenant_id, order_id, version, device_id',
      tenantConfig: 'tenantId',
    });
  }
}

export const localDb = new KavanaHmiDatabase();

// FIX A6 (2026-08-21): purge completo del IndexedDB al cerrar sesión.
// El HMI vive en quioscos compartidos por turnos: los logs offline y la
// config del tenant persisten en Dexie tras el logout y el siguiente
// operario (o cualquiera con acceso al quiosco) puede leerlos desde la
// consola del navegador. delete() destruye la BD entera; Dexie la recrea
// vacía con el schema en el siguiente uso.
export async function purgeLocalData(): Promise<void> {
  try {
    await localDb.delete();
  } catch {
    // Si Dexie falla (pestaña cerrándose, BD bloqueada), limpiar tabla a tabla.
    try {
      await Promise.all([
        localDb.offlineBlocks.clear(),
        localDb.failedBlocks.clear(),
        localDb.tenantConfig.clear(),
      ]);
    } catch {
      // Último recurso: nada local que purgar de forma fiable; el token ya
      // se ha eliminado de localStorage por el llamador.
    }
  }
}
