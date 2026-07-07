import { callApiWithTimeout } from './client.js';

const API_BASE = '';

export interface User {
  id: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  role: 'tenant_admin' | 'supervisor' | 'operario';
  created_at: string;
  updated_at: string;
}

export interface Workstation {
  id: string;
  name: string;
  code: string;
  status: 'active' | 'inactive';
  last_block_type: string | null;
  last_block_start: string | null;
  operator_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManufacturingModel {
  id: string;
  name: string;
  unit_of_measure: 'piezas/h' | 'm/h' | 'kg/h' | 'L/h' | null;
  target_rate: number | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  model_id: string;
  workstation_id: string;
  quantity: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  created_by: string;
  custom_fields: Record<string, any>;
  produced_quantity: number;
  defect_quantity: number;
  model_name: string;
  workstation_name: string;
  created_at: string;
  updated_at: string;
}

export interface ActivityBlock {
  id: string;
  type: 'produccion' | 'parada';
  start_time: string;
  end_time: string;
  produced_quantity: number | null;
  defect_quantity: number | null;
  downtime_reason: string | null;
  operator_name: string;
}

// Users
export async function fetchUsers(): Promise<User[]> {
  return callApiWithTimeout<User[]>(`${API_BASE}/api/users`);
}

export async function createUser(data: { username: string; password: string; role: string }): Promise<User> {
  return callApiWithTimeout<User>(`${API_BASE}/api/users`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Workstations
export async function fetchWorkstations(): Promise<Workstation[]> {
  return callApiWithTimeout<Workstation[]>(`${API_BASE}/api/workstations`);
}

export async function createWorkstation(data: { name: string; status?: string }): Promise<Workstation> {
  return callApiWithTimeout<Workstation>(`${API_BASE}/api/workstations`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Manufacturing Models
export async function fetchManufacturingModels(): Promise<ManufacturingModel[]> {
  return callApiWithTimeout<ManufacturingModel[]>(`${API_BASE}/api/manufacturing-models`);
}

export async function createManufacturingModel(data: { name: string; unit_of_measure?: 'piezas/h' | 'm/h' | 'kg/h' | 'L/h' }): Promise<ManufacturingModel> {
  return callApiWithTimeout<ManufacturingModel>(`${API_BASE}/api/manufacturing-models`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Orders
export async function fetchOrders(): Promise<Order[]> {
  return callApiWithTimeout<Order[]>(`${API_BASE}/api/orders`);
}

export async function createOrder(data: { model_id: string; workstation_id: string; quantity: number; custom_fields?: Record<string, any> }): Promise<Order> {
  return callApiWithTimeout<Order>(`${API_BASE}/api/orders`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateOrder(id: string, data: { status?: string; workstation_id?: string }): Promise<Order> {
  return callApiWithTimeout<Order>(`${API_BASE}/api/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteOrder(id: string): Promise<void> {
  return callApiWithTimeout<void>(`${API_BASE}/api/orders/${id}`, {
    method: 'DELETE',
  });
}

// Activity
export async function fetchOrderActivity(orderId: string): Promise<ActivityBlock[]> {
  return callApiWithTimeout<ActivityBlock[]>(`${API_BASE}/api/orders/${orderId}/activity`);
}

// Workstation Status
export async function fetchWorkstationsStatus(): Promise<Workstation[]> {
  return callApiWithTimeout<Workstation[]>(`${API_BASE}/api/orders/workstations-status`);
}
