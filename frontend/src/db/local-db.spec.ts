import Dexie, { type Table } from 'dexie';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import type { OfflineWorkBlock, FailedOfflineWorkBlock } from './local-db.js';

Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

class TestKavanaHmiDatabase extends Dexie {
  offlineBlocks!: Table<OfflineWorkBlock>;
  failedBlocks!: Table<FailedOfflineWorkBlock>;

  constructor(databaseName: string) {
    super(databaseName);
    this.version(3).stores({
      offlineBlocks: 'id, start_time, tenant_id, order_id',
      failedBlocks: 'id, start_time, tenant_id, order_id',
    });
  }
}

describe('Kavana HMI local IndexedDB queue', () => {
  let db: TestKavanaHmiDatabase;

  beforeEach(async () => {
    db?.close();
    db = new TestKavanaHmiDatabase(`TestKavanaHmiDatabase-${Date.now()}-${Math.random()}`);
    await db.open();
  });

  afterEach(() => {
    db?.close();
  });

  it('orders offline blocks by start_time for FIFO sync', async () => {
    await db.offlineBlocks.bulkAdd([
      offlineBlock('block-1', '2026-06-14T10:01:00.000Z', '2026-06-14T11:00:00.000Z'),
      offlineBlock('block-2', '2026-06-14T10:00:00.000Z', '2026-06-14T10:30:00.000Z'),
    ]);

    const oldestBlock = await db.offlineBlocks.orderBy('start_time').first();

    expect(oldestBlock?.id).toBe('block-2');

    if (oldestBlock) {
      await db.offlineBlocks.delete(oldestBlock.id);
    }

    expect(await db.offlineBlocks.count()).toBe(1);
  });

  it('stores failed sync attempts in dead-letter storage', async () => {
    await db.failedBlocks.add({
      ...offlineBlock('block-failed', '2026-06-14T10:00:00.000Z', '2026-06-14T11:00:00.000Z'),
      error: 'HTTP 409 conflict',
    });

    const failedBlock = await db.failedBlocks.get('block-failed');

    expect(failedBlock?.error).toBe('HTTP 409 conflict');
    expect(await db.failedBlocks.count()).toBe(1);
  });
});

function offlineBlock(id: string, start_time: string, end_time: string): OfflineWorkBlock {
  return {
    id,
    tenant_id: '10',
    order_id: '00000000-0000-0000-0000-000000000001',
    workstation_id: '00000000-0000-0000-0000-000000000011',
    operator_id: '00000000-0000-0000-0000-000000000021',
    type: 'produccion',
    downtime_reason: null,
    produced_quantity: 10,
    start_time,
    end_time,
    is_offline_event: true,
    client_device_id: 'vitest-hmi',
  };
}
