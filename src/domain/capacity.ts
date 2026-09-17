import type { Block, Engineer, PlanState, Uuid, WeekStart } from './types';

/** Fraction of a week deliberately left unallocated. See spec §F8 step 4. */
export const BUFFER_TARGET = 0.2;

export interface CellCapacity {
  engineerId: Uuid;
  weekStart: WeekStart;
  capacityHours: number;
  allocatedHours: number;
  /** Never negative: when allocation exceeds capacity this is 0 and `overHours` is positive. */
  bufferHours: number;
  overHours: number;
  bufferFraction: number;
  isOvercommitted: boolean;
  /** True when buffer has been eaten below the target but capacity is not yet exceeded. */
  isBelowBufferTarget: boolean;
}

export function blocksInCell(
  blocks: Block[],
  engineerId: Uuid,
  weekStart: WeekStart,
): Block[] {
  return blocks.filter(
    (b) => b.engineerId === engineerId && b.weekStart === weekStart,
  );
}

export function allocatedHours(
  blocks: Block[],
  engineerId: Uuid,
  weekStart: WeekStart,
): number {
  return blocksInCell(blocks, engineerId, weekStart).reduce(
    (sum, b) => sum + b.hours,
    0,
  );
}

export function cellCapacity(
  engineer: Engineer,
  weekStart: WeekStart,
  blocks: Block[],
): CellCapacity {
  const capacityHours = engineer.weeklyCapacityHours;
  const allocated = allocatedHours(blocks, engineer.id, weekStart);
  const remaining = capacityHours - allocated;
  const bufferHours = Math.max(0, remaining);
  const overHours = Math.max(0, -remaining);
  const bufferFraction = capacityHours > 0 ? bufferHours / capacityHours : 0;
  return {
    engineerId: engineer.id,
    weekStart,
    capacityHours,
    allocatedHours: allocated,
    bufferHours,
    overHours,
    bufferFraction,
    isOvercommitted: overHours > 0,
    isBelowBufferTarget: overHours === 0 && bufferFraction < BUFFER_TARGET,
  };
}

export interface SquadRollup {
  capacityHours: number;
  committedHours: number;
  bufferHours: number;
  overHours: number;
  bufferFraction: number;
}

export function squadRollup(
  state: Pick<PlanState, 'engineers' | 'blocks'>,
  weekStart: WeekStart,
): SquadRollup {
  const active = state.engineers.filter((e) => e.active);
  return active.reduce<SquadRollup>(
    (acc, engineer) => {
      const cell = cellCapacity(engineer, weekStart, state.blocks);
      const capacityHours = acc.capacityHours + cell.capacityHours;
      const bufferHours = acc.bufferHours + cell.bufferHours;
      return {
        capacityHours,
        committedHours:
          acc.committedHours + Math.min(cell.allocatedHours, cell.capacityHours),
        bufferHours,
        overHours: acc.overHours + cell.overHours,
        bufferFraction: capacityHours > 0 ? bufferHours / capacityHours : 0,
      };
    },
    {
      capacityHours: 0,
      committedHours: 0,
      bufferHours: 0,
      overHours: 0,
      bufferFraction: 0,
    },
  );
}

export interface BurnDown {
  initiativeId: Uuid;
  estimatedHours: number;
  actualHours: number;
  remainingHours: number;
  /** > 1 once actuals pass the estimate. */
  ratio: number;
  isOverEstimate: boolean;
}

export function burnDown(blocks: Block[], initiativeId: Uuid): BurnDown {
  const mine = blocks.filter((b) => b.initiativeId === initiativeId);
  const estimatedHours = mine.reduce((s, b) => s + b.hours, 0);
  const actualHours = mine.reduce((s, b) => s + b.actualHours, 0);
  return {
    initiativeId,
    estimatedHours,
    actualHours,
    remainingHours: Math.max(0, estimatedHours - actualHours),
    ratio: estimatedHours > 0 ? actualHours / estimatedHours : 0,
    isOverEstimate: actualHours > estimatedHours,
  };
}
