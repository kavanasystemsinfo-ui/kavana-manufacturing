import { create } from 'zustand';
import { calculateShiftKPI as calculateShiftKPIPure, type ShiftBlock, type ShiftKPI } from '../utils/shift-kpi.js';

export type { ShiftKPI };

export interface LastBlock {
  startTime: string;
  endTime: string;
  producedQuantity: number;
  defectQuantity: number;
  observations: string;
}

interface OperatorPanelState {
  startTime: string;
  setStartTime: (v: string) => void;
  endTime: string;
  setEndTime: (v: string) => void;
  producedQuantity: string;
  setProducedQuantity: (v: string) => void;
  defectQuantity: string;
  setDefectQuantity: (v: string) => void;
  observations: string;
  setObservations: (v: string) => void;

  lastBlock: LastBlock | null;
  setLastBlock: (block: LastBlock) => void;

  repeatLastBlock: () => void;
  calculateShiftKPI: (blocks: ShiftBlock[]) => ShiftKPI;
}

function currentHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export const useOperatorPanelStore = create<OperatorPanelState>((set, get) => ({
  startTime: '',
  setStartTime: (v) => set({ startTime: v }),
  endTime: '',
  setEndTime: (v) => set({ endTime: v }),
  producedQuantity: '',
  setProducedQuantity: (v) => set({ producedQuantity: v }),
  defectQuantity: '0',
  setDefectQuantity: (v) => set({ defectQuantity: v }),
  observations: '',
  setObservations: (v) => set({ observations: v }),

  lastBlock: null,
  setLastBlock: (block) => set({ lastBlock: block }),

  /**
   * Reutiliza el último bloque declarado para no re-teclear el turno:
   * conserva inicio, cantidades y observaciones, y fija el fin a la hora
   * actual, que es el caso normal de un bloque continuo.
   */
  repeatLastBlock: () => {
    const { lastBlock } = get();
    if (!lastBlock) return;
    set({
      startTime: lastBlock.startTime,
      endTime: currentHHMM(),
      producedQuantity: String(lastBlock.producedQuantity),
      defectQuantity: String(lastBlock.defectQuantity),
      observations: lastBlock.observations,
    });
  },

  calculateShiftKPI: (blocks) => calculateShiftKPIPure(blocks),
}));

export const useStartTime = () => useOperatorPanelStore((s) => s.startTime);
export const useSetStartTime = () => useOperatorPanelStore((s) => s.setStartTime);
export const useEndTime = () => useOperatorPanelStore((s) => s.endTime);
export const useSetEndTime = () => useOperatorPanelStore((s) => s.setEndTime);
export const useProducedQuantity = () => useOperatorPanelStore((s) => s.producedQuantity);
export const useSetProducedQuantity = () => useOperatorPanelStore((s) => s.setProducedQuantity);
export const useDefectQuantity = () => useOperatorPanelStore((s) => s.defectQuantity);
export const useSetDefectQuantity = () => useOperatorPanelStore((s) => s.setDefectQuantity);
export const useObservations = () => useOperatorPanelStore((s) => s.observations);
export const useSetObservations = () => useOperatorPanelStore((s) => s.setObservations);
export const useRepeatLastBlock = () => useOperatorPanelStore((s) => s.repeatLastBlock);
export const useLastBlock = () => useOperatorPanelStore((s) => s.lastBlock);
export const useSetLastBlock = () => useOperatorPanelStore((s) => s.setLastBlock);
export const useCalculateShiftKPI = () => useOperatorPanelStore((s) => s.calculateShiftKPI);
