import { AsyncLocalStorage } from 'node:async_hooks';
import type { TenantContext } from './tenant-context.interface.js';

export const tenantContextStorage = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext {
  const context = tenantContextStorage.getStore();

  if (!context) {
    throw new Error('Security Error: No operational tenant context found.');
  }

  return context;
}
