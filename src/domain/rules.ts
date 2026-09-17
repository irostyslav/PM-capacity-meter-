/**
 * The gates.
 *
 * Every rule the product enforces lives here as a pure function, so it can be
 * tested without a UI and cannot be bypassed by a component that forgot to
 * check. Per docs/product-spec.md §10: "Any gate that exists only in a
 * component is a bug."
 *
 * A rejection is never a bare refusal — each one carries the remedies the user
 * can act on, which the UI renders as buttons.
 */

import type {
  Block,
  Confidence,
  Initiative,
  ParkingLotItem,
  Person,
  TriageRecord,
  Uuid,
  WeekStart,
} from './types';
import { daysBetween, parseDate, weeksBetween } from './weeks';
import { cellCapacity } from './capacity';

/** A low-confidence block cannot be promised beyond this many days out. */
export const LOW_CONFIDENCE_HORIZON_DAYS = 14;

/** Spikes are timeboxed. The UI offers no other values. */
export const SPIKE_MIN_DAYS = 2;
export const SPIKE_MAX_DAYS = 5;

/** An item sitting undefined this long is flagged for an explicit decision. */
export const PARKING_LOT_STALE_WEEKS = 8;

/**
 * Discovery has to land before the engineering it informs. One week is the
 * minimum; the point is that it is a non-zero number.
 */
export const DISCOVERY_LEAD_WEEKS = 1;

export type RuleCode =
  | 'untriaged'
  | 'not-sizable'
  | 'undefined-item'
  | 'unsized-item'
  | 'low-confidence-beyond-horizon'
  | 'spike-timebox'
  | 'spike-needs-brief'
  | 'discovery-not-scheduled'
  | 'discovery-not-ahead'
  | 'pm-week-overcommitted';

export interface Remedy {
  id:
    | 'schedule-spike'
    | 'move-to-parking-lot'
    | 'answer-definition'
    | 'raise-confidence'
    | 'schedule-discovery'
    | 'move-engineering-later';
  label: string;
}

export type RuleResult =
  | { ok: true }
  | { ok: false; code: RuleCode; message: string; remedies: Remedy[] };

const allow: RuleResult = { ok: true };

function deny(code: RuleCode, message: string, remedies: Remedy[] = []): RuleResult {
  return { ok: false, code, message, remedies };
}

/**
 * F2 — nothing reaches the timeline unexamined. An initiative is schedulable
 * only once a triage record exists and question 4 was answered "yes".
 */
export function canSchedule(
  initiative: Initiative,
  triage: TriageRecord | undefined,
): RuleResult {
  if (!initiative.triageId || !triage) {
    return deny(
      'untriaged',
      'This has not been through triage. Five questions stand between a request and the board.',
    );
  }
  if (!triage.sizable) {
    return deny(
      'not-sizable',
      'Triage said this is not understood well enough to size, so it cannot be scheduled directly.',
      [
        { id: 'move-to-parking-lot', label: 'Move to parking lot' },
        { id: 'schedule-spike', label: 'Schedule a spike' },
      ],
    );
  }
  return allow;
}

/**
 * F3 — an item leaves the parking lot only once someone has said in one line
 * what would actually be built, and it has either an estimate or a spike.
 */
export function canGraduate(item: ParkingLotItem): RuleResult {
  if (!item.oneLineDefinition.trim()) {
    return deny(
      'undefined-item',
      'In one line: what would we actually be building?',
      [{ id: 'answer-definition', label: 'Answer the question' }],
    );
  }
  if (item.estimatedHours === null && item.spikeBlockId === null) {
    return deny(
      'unsized-item',
      'Defined, but not yet sized. It needs an estimate or a spike before it can be scheduled.',
      [{ id: 'schedule-spike', label: 'Schedule a spike' }],
    );
  }
  return allow;
}

/** True once an undefined item has sat in the lot long enough to demand a decision. */
export function isStale(item: ParkingLotItem, today: Date): boolean {
  if (item.oneLineDefinition.trim()) return false;
  return daysBetween(parseDate(item.addedAt), today) >= PARKING_LOT_STALE_WEEKS * 7;
}

/** The last week start a low-confidence block may occupy. */
export function lowConfidenceHorizon(today: Date): Date {
  const limit = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  limit.setDate(limit.getDate() + LOW_CONFIDENCE_HORIZON_DAYS);
  return limit;
}

/**
 * F5 — a low-confidence commitment far in the future is a promise made of hope,
 * and everyone downstream will treat it as real. If it matters and it's fuzzy,
 * it needs a spike first.
 */
export function canPlace(
  confidence: Confidence,
  weekStart: WeekStart,
  today: Date,
): RuleResult {
  if (confidence !== 'low') return allow;
  if (parseDate(weekStart) <= lowConfidenceHorizon(today)) return allow;
  return deny(
    'low-confidence-beyond-horizon',
    `Low confidence cannot be scheduled more than ${LOW_CONFIDENCE_HORIZON_DAYS} days out. ` +
      'A guess this far ahead will be read as a commitment.',
    [
      { id: 'schedule-spike', label: 'Schedule a spike' },
      { id: 'move-to-parking-lot', label: 'Move to parking lot' },
    ],
  );
}

/** Convenience wrapper for moving an existing block. */
export function canMoveBlock(
  block: Block,
  toWeek: WeekStart,
  today: Date,
): RuleResult {
  return canPlace(block.confidence, toWeek, today);
}

/**
 * Lowering confidence to `low` is itself a placement decision, so it goes
 * through the same horizon check rather than sneaking past it.
 */
export function canSetConfidence(
  block: Block,
  next: Confidence,
  today: Date,
): RuleResult {
  return canPlace(next, block.weekStart, today);
}

const RANK: Record<Confidence, number> = { low: 1, medium: 2, high: 3 };

/**
 * Raising confidence on an otherwise unchanged block needs a reason, which is
 * logged. This is what stops confidence quietly inflating under deadline
 * pressure.
 */
export function requiresReason(from: Confidence, to: Confidence): boolean {
  return RANK[to] > RANK[from];
}

export function isValidTimebox(days: number): boolean {
  return Number.isInteger(days) && days >= SPIKE_MIN_DAYS && days <= SPIKE_MAX_DAYS;
}

/** F4 — a spike's acceptance criterion is a written brief, not code. */
export function canCompleteSpike(block: Block): RuleResult {
  if (block.kind !== 'spike' || !block.spike) {
    return deny('spike-needs-brief', 'Not a spike.');
  }
  if (!block.spike.brief.trim()) {
    return deny(
      'spike-needs-brief',
      'A spike is done when the brief is written. Prose, not code: what we learned, what we would build, rough size, what is still unknown.',
    );
  }
  return allow;
}


/**
 * The PM's own gate (spec §6.3).
 *
 * Engineering work cannot be committed in a week unless the discovery or
 * definition that has to precede it is itself on the board, in an earlier week,
 * inside somebody's real capacity.
 *
 * Without this rule the PM's thinking is priced at zero: the plan implies the
 * discovery happened, the board never shows when, and the only place left for
 * it is evenings and weekends. Refusing here is what converts "I'll find the
 * time" into a visible scheduling conflict that other people can see.
 */
export function canCommitEngineering(
  initiativeId: Uuid,
  engineeringWeek: WeekStart,
  blocks: Block[],
): RuleResult {
  const discovery = blocks.filter(
    (b) =>
      b.kind === 'pm-work' &&
      b.initiativeId === initiativeId &&
      (b.pmWork === 'discovery' || b.pmWork === 'definition'),
  );

  if (discovery.length === 0) {
    return deny(
      'discovery-not-scheduled',
      'No discovery is scheduled for this work. Committing engineering to it prices that thinking at zero, ' +
        'and it will come out of somebody\'s evening.',
      [
        { id: 'schedule-discovery', label: 'Schedule discovery first' },
        { id: 'move-to-parking-lot', label: 'Move to parking lot' },
      ],
    );
  }

  const ahead = discovery.filter(
    (b) => weeksBetween(b.weekStart, engineeringWeek) >= DISCOVERY_LEAD_WEEKS,
  );
  if (ahead.length === 0) {
    return deny(
      'discovery-not-ahead',
      'The discovery for this work is scheduled in the same week as the build, or after it. ' +
        'Thinking that happens alongside the work it was meant to inform is not discovery — it is rework.',
      [
        { id: 'schedule-discovery', label: 'Move discovery earlier' },
        { id: 'move-engineering-later', label: 'Move the build later' },
      ],
    );
  }

  return allow;
}

/**
 * Whether a PM's week can absorb more thinking. Unlike the engineering board,
 * where overcommitment is loud but allowed, this one is worth refusing at the
 * point of commitment — an over-full PM week is precisely the state that turns
 * into unpaid overtime rather than a visible failure.
 */
export function canAbsorbPmWork(
  person: Person,
  weekStart: WeekStart,
  additionalHours: number,
  blocks: Block[],
): RuleResult {
  const cell = cellCapacity(person, weekStart, blocks);
  if (cell.bufferHours >= additionalHours) return allow;

  const shortfall = additionalHours - cell.bufferHours;
  return deny(
    'pm-week-overcommitted',
    `${person.name} has ${cell.bufferHours}h left that week and this needs ${additionalHours}h. ` +
      `The missing ${shortfall}h has to come from somewhere — name it, or move the work.`,
    [
      { id: 'move-engineering-later', label: 'Schedule it a week later' },
      { id: 'move-to-parking-lot', label: 'Move to parking lot' },
    ],
  );
}
