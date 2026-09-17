import type { Block, Person, PlanState, Role, Uuid, WeekStart } from './types';

/** Fraction of a week deliberately left unallocated. See spec §F8 step 4. */
export const BUFFER_TARGET = 0.2;

export interface CellCapacity {
  personId: Uuid;
  weekStart: WeekStart;
  /** The person's standing weekly hours, before absence. */
  nominalCapacityHours: number;
  /** PTO, holidays, on-call. These hours were never available to plan against. */
  unavailableHours: number;
  /** nominal − unavailable. This is what buffer and overcommitment measure against. */
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
  personId: Uuid,
  weekStart: WeekStart,
): Block[] {
  return blocks.filter(
    (b) => b.personId === personId && b.weekStart === weekStart,
  );
}

/** Hours planned against capacity. `unavailable` blocks are not planned work. */
export function allocatedHours(
  blocks: Block[],
  personId: Uuid,
  weekStart: WeekStart,
): number {
  return blocksInCell(blocks, personId, weekStart)
    .filter((b) => b.kind !== 'unavailable')
    .reduce((sum, b) => sum + b.hours, 0);
}

/** Hours the person is away: PTO, a holiday, an on-call rotation. */
export function unavailableHours(
  blocks: Block[],
  personId: Uuid,
  weekStart: WeekStart,
): number {
  return blocksInCell(blocks, personId, weekStart)
    .filter((b) => b.kind === 'unavailable')
    .reduce((sum, b) => sum + b.hours, 0);
}

export function cellCapacity(
  person: Person,
  weekStart: WeekStart,
  blocks: Block[],
): CellCapacity {
  const nominalCapacityHours = person.weeklyCapacityHours;
  const unavailable = unavailableHours(blocks, person.id, weekStart);
  const capacityHours = Math.max(0, nominalCapacityHours - unavailable);
  const allocated = allocatedHours(blocks, person.id, weekStart);
  const remaining = capacityHours - allocated;
  const bufferHours = Math.max(0, remaining);
  const overHours = Math.max(0, -remaining);
  const bufferFraction = capacityHours > 0 ? bufferHours / capacityHours : 0;
  return {
    personId: person.id,
    weekStart,
    nominalCapacityHours,
    unavailableHours: unavailable,
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
  state: Pick<PlanState, 'people' | 'blocks'>,
  weekStart: WeekStart,
): SquadRollup {
  // Engineers only. Mixing the PM into a squad total hides the exact thing the
  // PM's row exists to show — see spec §6.3.
  const active = state.people.filter((e) => e.active && e.role === 'engineer');
  return active.reduce<SquadRollup>(
    (acc, person) => {
      const cell = cellCapacity(person, weekStart, state.blocks);
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


/** Everyone in a role, in board order. */
export function peopleInRole(people: Person[], role: Role): Person[] {
  return people.filter((p) => p.active && p.role === role);
}

/**
 * The PM's own week, told plainly enough to put in front of somebody else.
 *
 * `overtimeHours` is the number this whole feature exists for: hours actually
 * logged beyond a sustainable week. It is evidence, not a status.
 */
export interface PersonWeek {
  personId: Uuid;
  name: string;
  weekStart: WeekStart;
  capacityHours: number;
  plannedHours: number;
  loggedHours: number;
  bufferHours: number;
  overtimeHours: number;
  isOvertime: boolean;
}

export function personWeek(
  person: Person,
  weekStart: WeekStart,
  blocks: Block[],
): PersonWeek {
  const cell = cellCapacity(person, weekStart, blocks);
  const loggedHours = blocksInCell(blocks, person.id, weekStart)
    .filter((b) => b.kind !== 'unavailable')
    .reduce((sum, b) => sum + b.actualHours, 0);
  const overtimeHours = Math.max(0, loggedHours - cell.capacityHours);
  return {
    personId: person.id,
    name: person.name,
    weekStart,
    capacityHours: cell.capacityHours,
    plannedHours: cell.allocatedHours,
    loggedHours,
    bufferHours: cell.bufferHours,
    overtimeHours,
    isOvertime: overtimeHours > 0,
  };
}

/** Hours of PM work sitting in one week, by type. */
export function pmWorkload(
  blocks: Block[],
  personId: Uuid,
  weekStart: WeekStart,
): { totalHours: number; byType: Record<string, number> } {
  const mine = blocksInCell(blocks, personId, weekStart).filter(
    (b) => b.kind === 'pm-work',
  );
  const byType: Record<string, number> = {};
  for (const block of mine) {
    const key = block.pmWork ?? 'other';
    byType[key] = (byType[key] ?? 0) + block.hours;
  }
  return { totalHours: mine.reduce((s, b) => s + b.hours, 0), byType };
}
