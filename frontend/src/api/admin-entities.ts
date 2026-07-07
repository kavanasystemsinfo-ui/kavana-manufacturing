import { callApiWithTimeout } from './client.js';

const API_BASE = '/api';

// ──── Types ────
export interface User {
  id: string;
  username: string;
  role: 'tenant_admin' | 'supervisor' | 'operario';
  first_name: string | null;
  last_name: string | null;
  employee_number: number | null;
  is_active: boolean;
  operator_category: string | null;
  default_workstation_id: string | null;
  last_login: string | null;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface Workstation {
  id: string;
  code: string;
  name: string;
  status: 'active' | 'inactive';
  tenant_id: string;
  created_at: string;
}

export interface ManufacturingModel {
  id: string;
  name: string;
  unit_of_measure: 'piezas/h' | 'm/h' | 'kg/h' | 'L/h' | null;
  target_rate: number | null;
  workstation_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  model_id: string;
  workstation_id: string;
  created_by: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  quantity: number;
  tenant_id: string;
  created_at: string;
}

export interface TenantCapabilities {
  tenantId: string;
  governanceVersion: number;
  modules: Record<string, { enabled: boolean; features: Record<string, unknown> }>;
  quotas: Record<string, unknown>;
  customFieldsSchema: Record<string, unknown>;
}

// ──── Users ────
export async function listUsers(): Promise<User[]> {
  return callApiWithTimeout<User[]>(`${API_BASE}/users`);
}

export async function createUser(data: {
  username: string;
  password: string;
  role: User['role'];
  first_name?: string;
  last_name?: string;
  employee_number?: number;
  operator_category?: string;
  default_workstation_id?: string | null;
}): Promise<User> {
  return callApiWithTimeout<User>(`${API_BASE}/users`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateUser(id: string, data: {
  username?: string;
  password?: string;
  role?: User['role'];
  first_name?: string;
  last_name?: string;
  employee_number?: number | null;
  operator_category?: string;
  default_workstation_id?: string | null;
  is_active?: boolean;
}): Promise<User> {
  return callApiWithTimeout<User>(`${API_BASE}/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteUser(id: string): Promise<void> {
  return callApiWithTimeout<void>(`${API_BASE}/users/${id}`, {
    method: 'DELETE',
  });
}

// ──── Workstations ────
export async function listWorkstations(): Promise<Workstation[]> {
  return callApiWithTimeout<Workstation[]>(`${API_BASE}/workstations`);
}

export async function createWorkstation(data: { name: string; code?: string; status?: 'active' | 'inactive' }): Promise<Workstation> {
  return callApiWithTimeout<Workstation>(`${API_BASE}/workstations`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateWorkstation(id: string, data: { name?: string; status?: 'active' | 'inactive' }): Promise<Workstation> {
  return callApiWithTimeout<Workstation>(`${API_BASE}/workstations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteWorkstation(id: string): Promise<void> {
  return callApiWithTimeout<void>(`${API_BASE}/workstations/${id}`, {
    method: 'DELETE',
  });
}

// ──── Manufacturing Models ────
export async function listManufacturingModels(): Promise<ManufacturingModel[]> {
  return callApiWithTimeout<ManufacturingModel[]>(`${API_BASE}/manufacturing-models`);
}

export async function createManufacturingModel(data: { name: string; unit_of_measure?: 'piezas/h' | 'm/h' | 'kg/h' | 'L/h' | null; target_rate?: number | null; workstation_id?: string | null }): Promise<ManufacturingModel> {
  return callApiWithTimeout<ManufacturingModel>(`${API_BASE}/manufacturing-models`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateManufacturingModel(id: string, data: { name?: string; unit_of_measure?: 'piezas/h' | 'm/h' | 'kg/h' | 'L/h' | null; target_rate?: number | null; workstation_id?: string | null }): Promise<ManufacturingModel> {
  return callApiWithTimeout<ManufacturingModel>(`${API_BASE}/manufacturing-models/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteManufacturingModel(id: string): Promise<void> {
  return callApiWithTimeout<void>(`${API_BASE}/manufacturing-models/${id}`, {
    method: 'DELETE',
  });
}

// ──── Orders ────
export async function listOrders(): Promise<Order[]> {
  return callApiWithTimeout<Order[]>(`${API_BASE}/orders`);
}

// ──── Tenant Capabilities ────
export async function fetchCapabilities(): Promise<TenantCapabilities> {
  return callApiWithTimeout<TenantCapabilities>(`${API_BASE}/tenant/capabilities`);
}

export async function toggleModuleCapability(moduleKey: string, enabled: boolean): Promise<void> {
  await callApiWithTimeout<void>(`${API_BASE}/tenant/capabilities/modules/${moduleKey}`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}

export async function updateCustomFieldsSchema(schema: {
  fields: Array<{ key: string; type: 'string' | 'number' | 'boolean'; required: boolean }>;
}): Promise<void> {
  await callApiWithTimeout<void>(`${API_BASE}/tenant/capabilities/custom-fields`, {
    method: 'PATCH',
    body: JSON.stringify(schema),
  });
}

// ──── Quality Checks ────
export interface QualityCheck {
  id: string;
  order_id: string;
  workstation_id: string;
  inspector_id: string;
  result: 'pass' | 'fail' | 'conditional';
  defect_count: number;
  defect_type: string | null;
  notes: string | null;
  checked_at: string;
}

export interface QualitySummary {
  total_checks: number;
  passed: number;
  failed: number;
  conditional: number;
  pass_rate: number;
  total_defects: number;
}

export async function createQualityCheck(data: {
  order_id: string;
  workstation_id: string;
  result: 'pass' | 'fail' | 'conditional';
  defect_count: number;
  defect_type?: string;
  notes?: string;
}): Promise<QualityCheck> {
  return callApiWithTimeout<QualityCheck>(`${API_BASE}/quality/checks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listQualityChecks(orderId: string): Promise<QualityCheck[]> {
  return callApiWithTimeout<QualityCheck[]>(`${API_BASE}/quality/orders/${orderId}/checks`);
}

export async function getQualitySummary(orderId: string): Promise<QualitySummary> {
  return callApiWithTimeout<QualitySummary>(`${API_BASE}/quality/orders/${orderId}/summary`);
}

// ──── Cost Entries ────
export interface CostEntry {
  id: string;
  order_id: string;
  category: 'material' | 'labor' | 'overhead' | 'energy';
  amount: number;
  currency: string;
  description: string | null;
  created_at: string;
}

export interface CostSummary {
  total_material: number;
  total_labor: number;
  total_overhead: number;
  total_energy: number;
  total_cost: number;
  currency: string;
}

export async function createCostEntry(data: {
  order_id: string;
  category: 'material' | 'labor' | 'overhead' | 'energy';
  amount: number;
  currency: string;
  description?: string;
}): Promise<CostEntry> {
  return callApiWithTimeout<CostEntry>(`${API_BASE}/costs/entries`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function listCostEntries(orderId: string): Promise<CostEntry[]> {
  return callApiWithTimeout<CostEntry[]>(`${API_BASE}/costs/orders/${orderId}/entries`);
}

export async function getCostSummary(orderId: string): Promise<CostSummary> {
  return callApiWithTimeout<CostSummary>(`${API_BASE}/costs/orders/${orderId}/summary`);
}

// ──── Global Admin (Tenants) ────
export interface GlobalTenant {
  id: string;
  name: string;
  subdomain: string | null;
  status: 'active' | 'suspended' | 'trial';
  feature_matrix: Record<string, unknown>;
  custom_fields_schema: Record<string, unknown>;
  governance_version: number;
  created_at: string;
  updated_at: string;
}

export interface TenantStats {
  tenant_id: string;
  user_count: number;
  workstation_count: number;
  order_count: number;
  production_block_count: number;
}

export async function listTenants(): Promise<GlobalTenant[]> {
  return callApiWithTimeout<GlobalTenant[]>(`${API_BASE}/global-admin/tenants`);
}

export async function getTenant(id: string): Promise<GlobalTenant> {
  return callApiWithTimeout<GlobalTenant>(`${API_BASE}/global-admin/tenants/${id}`);
}

export async function getTenantStats(id: string): Promise<TenantStats> {
  return callApiWithTimeout<TenantStats>(`${API_BASE}/global-admin/tenants/${id}/stats`);
}

export async function createTenant(data: { id: number; name: string; subdomain: string; status?: 'active' | 'suspended' | 'trial'; modules?: string[]; admin_username?: string; admin_password?: string }): Promise<GlobalTenant> {
  return callApiWithTimeout<GlobalTenant>(`${API_BASE}/global-admin/tenants`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTenant(id: string, data: { name?: string; status?: 'active' | 'suspended' | 'trial'; subdomain?: string }): Promise<GlobalTenant> {
  return callApiWithTimeout<GlobalTenant>(`${API_BASE}/global-admin/tenants/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTenant(id: string): Promise<void> {
  await callApiWithTimeout<void>(`${API_BASE}/global-admin/tenants/${id}`, {
    method: 'DELETE',
  });
}

export async function toggleTenantModule(tenantId: string, moduleKey: string, enabled: boolean): Promise<GlobalTenant> {
  return callApiWithTimeout<GlobalTenant>(`${API_BASE}/global-admin/tenants/${tenantId}/modules/${moduleKey}`, {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  });
}
