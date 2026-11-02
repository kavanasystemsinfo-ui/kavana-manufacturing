import { callApiWithTimeout } from './client.js';

/** Calculadora de embalaje de un puesto: piezas por paquete × paquetes por fila × filas por palet. */
export interface Calculator {
  id: string;
  workstation_id: string;
  name: string;
  pieces_per_pack: number;
  packs_per_row: number;
  rows_per_pallet: number;
  pieces_per_row: number;
  pieces_per_pallet: number;
}

export interface NewCalculator {
  workstation_id: string;
  name: string;
  pieces_per_pack: number;
  packs_per_row: number;
  rows_per_pallet: number;
}

export async function fetchCalculators(workstationId: string): Promise<Calculator[]> {
  const params = new URLSearchParams({ workstation_id: workstationId });
  return callApiWithTimeout<Calculator[]>(`/api/v1/production/calculators?${params.toString()}`);
}

export async function createCalculator(body: NewCalculator): Promise<Calculator> {
  return callApiWithTimeout<Calculator>('/api/v1/production/calculators', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
