import { describe, expect, it } from 'vitest';
import {
  bufferTrend,
  carryOverBreakdown,
  estimationBias,
  lotAging,
  riceScore,
  sortParkingLot,
} from '../metrics';
import { canGraduate, isStale } from '../rules';
import type { Block, ParkingLotItem, WeeklyReset } from '../types';

const TODAY = new Date(2026, 8, 17);

function item(over: Partial<ParkingLotItem> = {}): ParkingLotItem {
  return {
    id: 'p1',
    title: 'An idea',
    oneLineDefinition: '',
    addedAt: '2026-09-01',
    triageId: null,
    estimatedHours: null,
    spikeBlockId: null,
    order: 0,
    rice: null,
    ...over,
  };
}

function block(over: Partial<Block> = {}): Block {
  return {
    id: 'b1',
    personId: 'e1',
    initiativeId: 'i1',
    weekStart: '2026-09-14',
    hours: 10,
    confidence: 'high',
    kind: 'delivery',
    actualHours: 0,
    ...over,
  };
}

describe('RICE scoring', () => {
  it('computes reach × impact × confidence ÷ effort', () => {
    expect(
      riceScore({ reach: 100, impact: 2, confidence: 0.8, effortHours: 40 }),
    ).toBeCloseTo(4);
  });

  it('scores zero rather than infinity when effort is missing', () => {
    expect(riceScore({ reach: 100, impact: 3, confidence: 1, effortHours: 0 })).toBe(0);
    expect(riceScore(null)).toBe(0);
  });

  it('sorts by manual rank first, using score only to break ties', () => {
    const ordered = sortParkingLot([
      item({ id: 'low-rank-high-score', order: 5, rice: { reach: 900, impact: 3, confidence: 1, effortHours: 10 } }),
      item({ id: 'top', order: 0, rice: null }),
      item({ id: 'tie-a', order: 1, rice: { reach: 10, impact: 1, confidence: 1, effortHours: 10 } }),
      item({ id: 'tie-b', order: 1, rice: { reach: 100, impact: 1, confidence: 1, effortHours: 10 } }),
    ]);
    expect(ordered.map((i) => i.id)).toEqual([
      'top',
      'tie-b',
      'tie-a',
      'low-rank-high-score',
    ]);
  });

  it('never lets a high score open the graduation gate', () => {
    const hoarded = item({
      rice: { reach: 5000, impact: 3, confidence: 1, effortHours: 1 },
      oneLineDefinition: '',
    });
    expect(riceScore(hoarded.rice)).toBeGreaterThan(1000);
    const gate = canGraduate(hoarded);
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.code).toBe('undefined-item');
  });

  it('never lets a high score suppress the staleness flag', () => {
    const old = item({
      addedAt: '2026-06-01',
      rice: { reach: 5000, impact: 3, confidence: 1, effortHours: 1 },
    });
    expect(isStale(old, TODAY)).toBe(true);
  });
});

describe('parking lot aging', () => {
  it('reports median and oldest age, and how much of the lot is defined', () => {
    const aging = lotAging(
      [
        item({ id: 'a', addedAt: '2026-09-10' }),
        item({ id: 'b', addedAt: '2026-09-03', oneLineDefinition: 'A thing.' }),
        item({ id: 'c', addedAt: '2026-08-17' }),
      ],
      TODAY,
    );
    expect(aging.count).toBe(3);
    expect(aging.medianAgeDays).toBe(14);
    expect(aging.oldestAgeDays).toBe(31);
    expect(aging.definedShare).toBeCloseTo(1 / 3);
  });

  it('treats an empty lot as healthy rather than dividing by zero', () => {
    expect(lotAging([], TODAY)).toEqual({
      count: 0,
      medianAgeDays: 0,
      oldestAgeDays: 0,
      definedShare: 1,
    });
  });
});

describe('estimation bias', () => {
  it('names the direction the squad is wrong in', () => {
    const under = estimationBias([
      block({ id: 'a', hours: 10, actualHours: 14 }),
      block({ id: 'b', hours: 10, actualHours: 12 }),
    ]);
    expect(under.direction).toBe('under-estimating');
    expect(under.percentOff).toBe(30);
    expect(under.sampleSize).toBe(2);
  });

  it('calls a close estimate accurate rather than precise-but-wrong', () => {
    expect(estimationBias([block({ hours: 20, actualHours: 20.4 })]).direction).toBe(
      'accurate',
    );
  });

  it('ignores blocks with nothing logged, and absence blocks entirely', () => {
    const bias = estimationBias([
      block({ id: 'a', hours: 10, actualHours: 0 }),
      block({ id: 'b', hours: 999, actualHours: 999, kind: 'unavailable' }),
    ]);
    expect(bias.sampleSize).toBe(0);
    expect(bias.direction).toBe('accurate');
  });
});

describe('carry-over reasons', () => {
  const reset = (over: Partial<WeeklyReset>): WeeklyReset => ({
    id: 'r1',
    weekStart: '2026-09-14',
    completedAt: '2026-09-18',
    shipped: [],
    slipped: [],
    carryOvers: [],
    bufferBeforeByPerson: {},
    bufferAfterByPerson: {},
    acceptedBelowThreshold: false,
    notes: '',
    ...over,
  });

  it('totals hours by cause, biggest first', () => {
    const breakdown = carryOverBreakdown([
      reset({
        carryOvers: [
          { blockId: 'b1', reason: 'scope-grew', hoursCarried: 6, note: '' },
          { blockId: 'b2', reason: 'incident', hoursCarried: 4, note: '' },
        ],
      }),
      reset({
        weekStart: '2026-09-21',
        carryOvers: [
          { blockId: 'b3', reason: 'scope-grew', hoursCarried: 10, note: '' },
        ],
      }),
    ]);
    expect(breakdown[0]).toEqual({ reason: 'scope-grew', hours: 16, occurrences: 2 });
    expect(breakdown[1]).toEqual({ reason: 'incident', hours: 4, occurrences: 1 });
  });

  it('reports buffer week by week, oldest first', () => {
    const trend = bufferTrend([
      reset({ weekStart: '2026-09-21', bufferAfterByPerson: { e1: 3, e2: 3 } }),
      reset({ weekStart: '2026-09-14', bufferAfterByPerson: { e1: 9, e2: 9 } }),
    ]);
    expect(trend.map((t) => t.weekStart)).toEqual(['2026-09-14', '2026-09-21']);
    expect(trend[0]?.bufferFraction).toBeCloseTo(0.3);
    expect(trend[1]?.bufferFraction).toBeCloseTo(0.1);
  });
});
