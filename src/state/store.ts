import { create } from 'zustand';
import { produce } from 'immer';
import type {
  Block,
  Confidence,
  CommitmentAction,
  PlanState,
  Uuid,
  WeekStart,
} from '../domain/types';
import { seedState } from '../domain/seed';
import { canMoveBlock, canSetConfidence, requiresReason } from '../domain/rules';
import type { RuleResult } from '../domain/rules';
import { toISODate } from '../domain/weeks';

/**
 * The store applies domain rules; it never re-implements them. A component
 * calls `moveBlock` and gets back the same RuleResult the domain produced, so
 * there is exactly one place a gate can be changed.
 */

export interface PendingRejection {
  blockId: Uuid;
  target: { engineerId: Uuid; weekStart: WeekStart } | null;
  result: Extract<RuleResult, { ok: false }>;
}

interface Store extends PlanState {
  today: Date;
  selectedBlockId: Uuid | null;
  focusMode: boolean;
  rejection: PendingRejection | null;

  select: (id: Uuid | null) => void;
  toggleFocusMode: () => void;
  dismissRejection: () => void;

  moveBlock: (id: Uuid, engineerId: Uuid, weekStart: WeekStart) => RuleResult;
  setConfidence: (id: Uuid, confidence: Confidence, reason?: string) => RuleResult;
  logActuals: (id: Uuid, hours: number) => void;
  removeBlock: (id: Uuid) => void;
  addLogEntry: (entry: {
    requester: string;
    action: CommitmentAction;
    whatWasCut: string;
    note?: string;
    initiativeId?: Uuid | null;
  }) => void;
}

const TODAY = new Date();

let counter = 0;
const nextId = (prefix: string) => `${prefix}${Date.now().toString(36)}${counter++}`;

export const useStore = create<Store>((set, get) => ({
  ...seedState(TODAY),
  today: TODAY,
  selectedBlockId: null,
  focusMode: false,
  rejection: null,

  select: (id) => set({ selectedBlockId: id }),
  toggleFocusMode: () => set((s) => ({ focusMode: !s.focusMode })),
  dismissRejection: () => set({ rejection: null }),

  moveBlock: (id, engineerId, weekStart) => {
    const state = get();
    const block = state.blocks.find((b) => b.id === id);
    if (!block) return { ok: true };
    if (block.engineerId === engineerId && block.weekStart === weekStart) {
      return { ok: true };
    }

    const result = canMoveBlock(block, weekStart, state.today);
    if (!result.ok) {
      set({ rejection: { blockId: id, target: { engineerId, weekStart }, result } });
      return result;
    }

    const from = describe(state, block);
    set(
      produce<Store>((draft) => {
        const target = draft.blocks.find((b) => b.id === id);
        if (!target) return;
        target.engineerId = engineerId;
        target.weekStart = weekStart;
        draft.log.push({
          id: nextId('l'),
          timestamp: toISODate(draft.today),
          requester: 'PM',
          initiativeId: target.initiativeId,
          action: 'rebalanced',
          whatWasCut: `moved from ${from} to ${describe(draft, target)}`,
          note: '',
        });
      }),
    );
    return result;
  },

  setConfidence: (id, confidence, reason) => {
    const state = get();
    const block = state.blocks.find((b) => b.id === id);
    if (!block) return { ok: true };

    const result = canSetConfidence(block, confidence, state.today);
    if (!result.ok) {
      set({ rejection: { blockId: id, target: null, result } });
      return result;
    }
    if (requiresReason(block.confidence, confidence) && !reason?.trim()) {
      return {
        ok: false,
        code: 'untriaged',
        message:
          'Nothing about the block changed, so raising confidence needs a reason. It gets logged.',
        remedies: [{ id: 'raise-confidence', label: 'Give a reason' }],
      };
    }

    const from = block.confidence;
    set(
      produce<Store>((draft) => {
        const target = draft.blocks.find((b) => b.id === id);
        if (!target) return;
        target.confidence = confidence;
        if (reason?.trim()) {
          draft.log.push({
            id: nextId('l'),
            timestamp: toISODate(draft.today),
            requester: 'PM',
            initiativeId: target.initiativeId,
            action: 'committed',
            whatWasCut: reason.trim(),
            note: `confidence ${from} → ${confidence}`,
          });
        }
      }),
    );
    return result;
  },

  logActuals: (id, hours) =>
    set(
      produce<Store>((draft) => {
        const block = draft.blocks.find((b) => b.id === id);
        if (block) block.actualHours += hours;
      }),
    ),

  removeBlock: (id) =>
    set(
      produce<Store>((draft) => {
        const block = draft.blocks.find((b) => b.id === id);
        if (!block) return;
        draft.log.push({
          id: nextId('l'),
          timestamp: toISODate(draft.today),
          requester: 'PM',
          initiativeId: block.initiativeId,
          action: 'cut',
          whatWasCut: `${block.hours}h returned to buffer`,
          note: '',
        });
        draft.blocks = draft.blocks.filter((b) => b.id !== id);
        if (draft.selectedBlockId === id) draft.selectedBlockId = null;
      }),
    ),

  addLogEntry: (entry) =>
    set(
      produce<Store>((draft) => {
        draft.log.push({
          id: nextId('l'),
          timestamp: toISODate(draft.today),
          initiativeId: entry.initiativeId ?? null,
          note: entry.note ?? '',
          requester: entry.requester,
          action: entry.action,
          whatWasCut: entry.whatWasCut,
        });
      }),
    ),
}));

function describe(state: Pick<PlanState, 'engineers'>, block: Block): string {
  const engineer = state.engineers.find((e) => e.id === block.engineerId);
  return `${engineer?.name ?? 'unknown'}, week of ${block.weekStart}`;
}
