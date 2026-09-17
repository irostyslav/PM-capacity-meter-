import { describe, expect, it } from 'vitest';
import {
  BUFFER_TARGET,
  burnDown,
  cellCapacity,
  squadRollup,
} from '../capacity';
import type { Block, Person } from '../types';

const WEEK = '2026-09-14';

function person(over: Partial<Person> = {}): Person {
  return {
    id: 'e1',
    name: 'Priya Raman',
    color: '#5F6C7A',
    role: 'engineer',
    weeklyCapacityHours: 30,
    active: true,
    ...over,
  };
}

function block(over: Partial<Block> = {}): Block {
  return {
    id: 'b1',
    personId: 'e1',
    initiativeId: 'i1',
    weekStart: WEEK,
    hours: 10,
    confidence: 'high',
    kind: 'delivery',
    actualHours: 0,
    ...over,
  };
}

describe('cell capacity', () => {
  it('reports the remainder as buffer, not as empty space', () => {
    const cell = cellCapacity(person(), WEEK, [block({ hours: 18 })]);
    expect(cell.bufferHours).toBe(12);
    expect(cell.overHours).toBe(0);
    expect(cell.isOvercommitted).toBe(false);
  });

  it('defaults an person week to 30 hours, not 40', () => {
    expect(person().weeklyCapacityHours).toBe(30);
  });

  it('reports overcommitment without letting buffer go negative', () => {
    const cell = cellCapacity(person(), WEEK, [
      block({ id: 'a', hours: 22 }),
      block({ id: 'b', hours: 12 }),
    ]);
    expect(cell.allocatedHours).toBe(34);
    expect(cell.bufferHours).toBe(0);
    expect(cell.overHours).toBe(4);
    expect(cell.isOvercommitted).toBe(true);
  });

  it('flags a cell whose buffer has been eaten below the target', () => {
    const cell = cellCapacity(person(), WEEK, [block({ hours: 27 })]);
    expect(cell.bufferFraction).toBeLessThan(BUFFER_TARGET);
    expect(cell.isBelowBufferTarget).toBe(true);
  });

  it('does not double-report an overcommitted cell as merely below target', () => {
    const cell = cellCapacity(person(), WEEK, [block({ hours: 40 })]);
    expect(cell.isOvercommitted).toBe(true);
    expect(cell.isBelowBufferTarget).toBe(false);
  });

  it('ignores blocks belonging to another person or week', () => {
    const cell = cellCapacity(person(), WEEK, [
      block({ id: 'a', hours: 10 }),
      block({ id: 'b', hours: 10, personId: 'e2' }),
      block({ id: 'c', hours: 10, weekStart: '2026-09-21' }),
    ]);
    expect(cell.allocatedHours).toBe(10);
  });
});

describe('squad rollup', () => {
  it('counts committed hours only up to capacity, and surfaces the rest as over', () => {
    const people = [person(), person({ id: 'e2', name: 'Marcus Bell' })];
    const blocks = [
      block({ id: 'a', hours: 20 }),
      block({ id: 'b', hours: 34, personId: 'e2' }),
    ];
    const roll = squadRollup({ people, blocks }, WEEK);
    expect(roll.capacityHours).toBe(60);
    expect(roll.committedHours).toBe(50);
    expect(roll.bufferHours).toBe(10);
    expect(roll.overHours).toBe(4);
  });

  it('leaves inactive people out of the totals', () => {
    const people = [person(), person({ id: 'e2', active: false })];
    const roll = squadRollup({ people, blocks: [] }, WEEK);
    expect(roll.capacityHours).toBe(30);
  });
});

describe('burn-down', () => {
  it('sums estimate and actuals across every block on an initiative', () => {
    const blocks = [
      block({ id: 'a', hours: 16, actualHours: 12 }),
      block({ id: 'b', hours: 18, actualHours: 4, weekStart: '2026-09-21' }),
      block({ id: 'c', hours: 99, actualHours: 99, initiativeId: 'i2' }),
    ];
    const burn = burnDown(blocks, 'i1');
    expect(burn.estimatedHours).toBe(34);
    expect(burn.actualHours).toBe(16);
    expect(burn.remainingHours).toBe(18);
    expect(burn.isOverEstimate).toBe(false);
  });

  it('flags an initiative that has run past its estimate', () => {
    const burn = burnDown([block({ hours: 10, actualHours: 14 })], 'i1');
    expect(burn.isOverEstimate).toBe(true);
    expect(burn.remainingHours).toBe(0);
    expect(burn.ratio).toBeCloseTo(1.4);
  });
});

describe('absence reduces capacity rather than filling it', () => {
  it('shrinks the week by PTO instead of counting it as planned work', () => {
    const cell = cellCapacity(person(), WEEK, [
      block({ id: 'pto', hours: 12, kind: 'unavailable' }),
      block({ id: 'work', hours: 12 }),
    ]);
    expect(cell.nominalCapacityHours).toBe(30);
    expect(cell.unavailableHours).toBe(12);
    expect(cell.capacityHours).toBe(18);
    expect(cell.allocatedHours).toBe(12);
    expect(cell.bufferHours).toBe(6);
  });

  it('overcommits an person whose week shrank under work already planned', () => {
    const cell = cellCapacity(person(), WEEK, [
      block({ id: 'oncall', hours: 20, kind: 'unavailable' }),
      block({ id: 'work', hours: 16 }),
    ]);
    expect(cell.capacityHours).toBe(10);
    expect(cell.overHours).toBe(6);
    expect(cell.isOvercommitted).toBe(true);
  });

  it('never lets absence push capacity below zero', () => {
    const cell = cellCapacity(person(), WEEK, [
      block({ id: 'sabbatical', hours: 50, kind: 'unavailable' }),
    ]);
    expect(cell.capacityHours).toBe(0);
    expect(cell.bufferHours).toBe(0);
  });
});
