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
  TriageRecord,
  WeekStart,
} from './types';
import { daysBetween, parseDate } from './weeks';

/** A low-confidence block cannot be promised beyond this many days out. */
export const LOW_CONFIDENCE_HORIZON_DAYS = 14;

/** Spikes are timeboxed. The UI offers no other values. */
export const SPIKE_MIN_DAYS = 2;
export const SPIKE_MAX_DAYS = 5;

/** An item sitting undefined this long is flagged for an explicit decision. */
export const PARKING_LOT_STALE_WEEKS = 8;

export type RuleCode =
  | 'untriaged'
  | 'not-sizable'
  | 'undefined-item'
  | 'unsized-item'
  | 'low-confidence-beyond-horizon'
  | 'spike-timebox'
  | 'spike-needs-brief';

export interface Remedy {
  id: 'schedule-spike' | 'move-to-parking-lot' | 'answer-definition' | 'raise-confidence';
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
