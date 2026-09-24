import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { CascadeState, AlignmentFlag } from '../domain/types';
import { SEED, SEED_CAPACITY } from '../domain/seed';
import { computeFlags } from '../domain/flags';
import { computeMeasureCapacity, rollUpCapacity } from '../domain/capacity';

interface CascadeStore extends CascadeState {
  /** Selected node id for the drawer. */
  selectedNodeId: string | null;
  selectedNodeType: 'vision' | 'value' | 'method' | 'measure' | 'obstacle' | 'request' | null;

  /** Derived — recomputed on every store change. */
  flags: AlignmentFlag[];
  measureCapacities: ReturnType<typeof rollUpCapacity>;

  select: (id: string | null, type: CascadeStore['selectedNodeType']) => void;
  resolveFlag: (code: string, nodeId: string, note: string) => void;
  triageRequest: (requestId: string, disposition: 'aligned' | 'parked' | 'declined', initiativeId?: string) => void;
  linkMeasureToInitiative: (measureId: string, initiativeId: string) => void;
}

function derive(state: CascadeState) {
  const flags = computeFlags(state);
  const base = computeMeasureCapacity(state, SEED_CAPACITY.initiatives);
  const measureCapacities = rollUpCapacity(base, state.measures);
  return { flags, measureCapacities };
}

export const useCascadeStore = create<CascadeStore>()(
  immer((set) => ({
    ...SEED,
    selectedNodeId: null,
    selectedNodeType: null,
    ...derive(SEED),

    select: (id, type) =>
      set((s) => {
        s.selectedNodeId = id;
        s.selectedNodeType = type;
      }),

    resolveFlag: (code, nodeId, note) =>
      set((s) => {
        s.flagResolutions.push({
          flagCode: code as any,
          nodeId,
          resolvedAt: new Date().toISOString(),
          resolvedBy: 'You (PM)',
          note,
        });
        const derived = derive(s as CascadeState);
        s.flags = derived.flags as any;
      }),

    triageRequest: (requestId, disposition, initiativeId) =>
      set((s) => {
        const req = s.inboundRequests.find((r) => r.id === requestId);
        if (!req) return;
        req.disposition = disposition;
        if (initiativeId) req.resolvedToInitiativeId = initiativeId;
      }),

    linkMeasureToInitiative: (measureId, initiativeId) =>
      set((s) => {
        const m = s.measures.find((m) => m.id === measureId);
        if (!m) return;
        if (!m.initiativeIds.includes(initiativeId)) {
          m.initiativeIds.push(initiativeId);
        }
        const derived = derive(s as CascadeState);
        s.flags = derived.flags as any;
        s.measureCapacities = derived.measureCapacities as any;
      }),
  })),
);
