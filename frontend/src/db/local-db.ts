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
  is_offline_event: boolean;
  client_device_id: string;
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
  }
}

export const localDb = new KavanaHmiDatabase();
