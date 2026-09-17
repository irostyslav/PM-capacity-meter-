/**
 * Measures the squad looks at over time, as opposed to the live state the
 * board shows. These answer the coach's questions: is the lot a holding pen or
 * a graveyard, do we estimate well, and why does work carry over?
 */

import type {
  Block,
  CarryOverReason,
  ParkingLotItem,
  RiceScore,
  WeeklyReset,
} from './types';
import { daysBetween, parseDate } from './weeks';

/** Reach × Impact × Confidence ÷ Effort. Zero effort scores 0 rather than Infinity. */
export function riceScore(rice: RiceScore | null): number {
  if (!rice || rice.effortHours <= 0) return 0;
  return (rice.reach * rice.impact * rice.confidence) / rice.effortHours;
}

/**
 * Manual stack rank wins; RICE breaks ties. A PM who has dragged the lot into
 * an order means it, and a score should not silently reorder their decision.
 */
export function sortParkingLot(items: ParkingLotItem[]): ParkingLotItem[] {
  return [...items].sort(
    (a, b) => a.order - b.order || riceScore(b.rice) - riceScore(a.rice),
  );
}

export interface LotAging {
  count: number;
  medianAgeDays: number;
  oldestAgeDays: number;
  /** Share of items somebody has actually defined. The lot's health signal. */
  definedShare: number;
}

/**
 * How long fuzzy work sits before anyone does the thinking. A lot whose median
 * age climbs while `definedShare` falls is a graveyard, not a holding pen.
 */
export function lotAging(items: ParkingLotItem[], today: Date): LotAging {
  if (items.length === 0) {
    return { count: 0, medianAgeDays: 0, oldestAgeDays: 0, definedShare: 1 };
  }
  const ages = items
    .map((i) => daysBetween(parseDate(i.addedAt), today))
    .sort((a, b) => a - b);
  const defined = items.filter((i) => i.oneLineDefinition.trim()).length;
  return {
    count: items.length,
    medianAgeDays: median(ages),
    oldestAgeDays: ages.at(-1) ?? 0,
    definedShare: defined / items.length,
  };
}

export interface EstimationBias {
  /** actual ÷ estimated across every block with logged time. */
  ratio: number;
  /** How far off, as a percentage, in the direction named below. */
  percentOff: number;
  direction: 'over-estimating' | 'under-estimating' | 'accurate';
  /** Blocks the figure is drawn from. Small samples mean little. */
  sampleSize: number;
}

/** Within 5% either way counts as accurate — estimates are not a precision instrument. */
const ACCURATE_BAND = 0.05;

export function estimationBias(blocks: Block[]): EstimationBias {
  const scored = blocks.filter((b) => b.actualHours > 0 && b.kind !== 'unavailable');
  const estimated = scored.reduce((s, b) => s + b.hours, 0);
  const actual = scored.reduce((s, b) => s + b.actualHours, 0);
  if (scored.length === 0 || estimated === 0) {
    return { ratio: 1, percentOff: 0, direction: 'accurate', sampleSize: 0 };
  }
  const ratio = actual / estimated;
  return {
    ratio,
    percentOff: Math.round(Math.abs(ratio - 1) * 100),
    direction:
      Math.abs(ratio - 1) <= ACCURATE_BAND
        ? 'accurate'
        : ratio < 1
          ? 'over-estimating'
          : 'under-estimating',
    sampleSize: scored.length,
  };
}

/**
 * Hours carried per reason, biggest first. This is the estimation-accuracy
 * feedback loop: "scope-grew" three weeks running is a different problem from
 * "incident" three weeks running.
 */
export function carryOverBreakdown(
  resets: WeeklyReset[],
): Array<{ reason: CarryOverReason; hours: number; occurrences: number }> {
  const totals = new Map<CarryOverReason, { hours: number; occurrences: number }>();
  for (const reset of resets) {
    for (const carry of reset.carryOvers) {
      const current = totals.get(carry.reason) ?? { hours: 0, occurrences: 0 };
      totals.set(carry.reason, {
        hours: current.hours + carry.hoursCarried,
        occurrences: current.occurrences + 1,
      });
    }
  }
  return [...totals.entries()]
    .map(([reason, v]) => ({ reason, ...v }))
    .sort((a, b) => b.hours - a.hours);
}

/** Buffer actually held per week, oldest first — does the 20% target survive contact? */
export function bufferTrend(
  resets: WeeklyReset[],
): Array<{ weekStart: string; bufferFraction: number }> {
  return [...resets]
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart))
    .map((reset) => {
      const after = Object.values(reset.bufferAfterByEngineer);
      const total = after.reduce((s, v) => s + v, 0);
      return {
        weekStart: reset.weekStart,
        bufferFraction: after.length > 0 ? total / after.length / 30 : 0,
      };
    });
}

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid] ?? 0;
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}
