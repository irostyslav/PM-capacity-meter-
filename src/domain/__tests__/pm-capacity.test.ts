import { describe, expect, it } from 'vitest';
import { canAbsorbPmWork, canCommitEngineering } from '../rules';
import { personWeek, pmWorkload } from '../capacity';
import { overtimeLedger, pmTimeBreakdown } from '../metrics';
import type { Block, Person } from '../types';

const PM: Person = {
  id: 'pm1',
  name: 'You',
  color: '#5F6C7A',
  role: 'pm',
  weeklyCapacityHours: 24,
  active: true,
};

function pmBlock(over: Partial<Block> = {}): Block {
  return {
    id: 'p1',
    personId: 'pm1',
    initiativeId: 'i1',
    weekStart: '2026-09-14',
    hours: 8,
    confidence: 'high',
    kind: 'pm-work',
    actualHours: 0,
    pmWork: 'discovery',
    ...over,
  };
}

describe('the discovery lead-time gate', () => {
  it('refuses engineering work with no discovery scheduled at all', () => {
    const result = canCommitEngineering('i1', '2026-09-21', []);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('discovery-not-scheduled');
      expect(result.remedies.map((r) => r.id)).toContain('schedule-discovery');
    }
  });

  it('refuses discovery scheduled in the same week as the build', () => {
    const result = canCommitEngineering('i1', '2026-09-14', [
      pmBlock({ weekStart: '2026-09-14' }),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('discovery-not-ahead');
  });

  it('refuses discovery scheduled after the build', () => {
    const result = canCommitEngineering('i1', '2026-09-14', [
      pmBlock({ weekStart: '2026-09-28' }),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('discovery-not-ahead');
  });

  it('allows engineering once discovery lands at least a week ahead', () => {
    expect(
      canCommitEngineering('i1', '2026-09-21', [pmBlock({ weekStart: '2026-09-14' })])
        .ok,
    ).toBe(true);
  });

  it('accepts definition as well as discovery', () => {
    expect(
      canCommitEngineering('i1', '2026-09-21', [
        pmBlock({ weekStart: '2026-09-14', pmWork: 'definition' }),
      ]).ok,
    ).toBe(true);
  });

  it('does not accept triage or stakeholder time as the thinking', () => {
    const result = canCommitEngineering('i1', '2026-09-21', [
      pmBlock({ weekStart: '2026-09-14', pmWork: 'triage' }),
      pmBlock({ id: 'p2', weekStart: '2026-09-14', pmWork: 'stakeholder' }),
    ]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('discovery-not-scheduled');
  });

  it('does not accept another initiative’s discovery', () => {
    const result = canCommitEngineering('i1', '2026-09-21', [
      pmBlock({ initiativeId: 'i2', weekStart: '2026-09-14' }),
    ]);
    expect(result.ok).toBe(false);
  });
});

describe('the PM week', () => {
  it('refuses more thinking than the week can hold, and names the shortfall', () => {
    const blocks = [pmBlock({ hours: 20 })];
    const result = canAbsorbPmWork(PM, '2026-09-14', 8, blocks);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('pm-week-overcommitted');
      expect(result.message).toContain('4h');
    }
  });

  it('allows work that fits the remaining buffer', () => {
    expect(canAbsorbPmWork(PM, '2026-09-14', 4, [pmBlock({ hours: 20 })]).ok).toBe(
      true,
    );
  });

  it('counts hours logged past capacity as overtime', () => {
    const week = personWeek(PM, '2026-09-14', [
      pmBlock({ id: 'a', hours: 10, actualHours: 14 }),
      pmBlock({ id: 'b', hours: 14, actualHours: 18 }),
    ]);
    expect(week.capacityHours).toBe(24);
    expect(week.plannedHours).toBe(24);
    expect(week.loggedHours).toBe(32);
    expect(week.overtimeHours).toBe(8);
    expect(week.isOvertime).toBe(true);
  });

  it('reports no overtime for a week that stayed inside capacity', () => {
    const week = personWeek(PM, '2026-09-14', [pmBlock({ hours: 10, actualHours: 9 })]);
    expect(week.overtimeHours).toBe(0);
    expect(week.isOvertime).toBe(false);
  });

  it('breaks the week down by kind of thinking', () => {
    const load = pmWorkload(
      [
        pmBlock({ id: 'a', hours: 10, pmWork: 'discovery' }),
        pmBlock({ id: 'b', hours: 4, pmWork: 'triage' }),
        pmBlock({ id: 'c', hours: 6, pmWork: 'stakeholder' }),
      ],
      'pm1',
      '2026-09-14',
    );
    expect(load.totalHours).toBe(20);
    expect(load.byType).toEqual({ discovery: 10, triage: 4, stakeholder: 6 });
  });
});

describe('the overtime ledger', () => {
  const weeks: Block[] = [
    pmBlock({ id: 'w1', weekStart: '2026-08-24', hours: 24, actualHours: 30 }),
    pmBlock({ id: 'w2', weekStart: '2026-08-31', hours: 24, actualHours: 34 }),
    pmBlock({ id: 'w3', weekStart: '2026-09-07', hours: 24, actualHours: 22 }),
    pmBlock({ id: 'w4', weekStart: '2026-09-14', hours: 24, actualHours: 32 }),
  ];

  it('totals the hours worked past a sustainable week', () => {
    const ledger = overtimeLedger(PM, weeks);
    expect(ledger.totalOvertimeHours).toBe(6 + 10 + 0 + 8);
    expect(ledger.weeksOver).toBe(3);
  });

  it('reports the current run of overtime weeks, not just the total', () => {
    const ledger = overtimeLedger(PM, weeks);
    expect(ledger.currentStreak).toBe(1);
    expect(ledger.longestStreak).toBe(2);
  });

  it('averages only over weeks that were actually worked', () => {
    const withFuture = [
      ...weeks,
      pmBlock({ id: 'w5', weekStart: '2026-09-21', hours: 24, actualHours: 0 }),
    ];
    const ledger = overtimeLedger(PM, withFuture);
    expect(ledger.averageOvertimePerWeek).toBeCloseTo(24 / 4);
  });

  it('does not count a week against the PM when they were away', () => {
    const ledger = overtimeLedger(PM, [
      pmBlock({ id: 'a', weekStart: '2026-09-14', hours: 6, actualHours: 6 }),
      {
        ...pmBlock({ id: 'pto', weekStart: '2026-09-14' }),
        kind: 'unavailable',
        hours: 18,
        actualHours: 0,
      },
    ]);
    expect(ledger.weeks[0]?.capacityHours).toBe(6);
    expect(ledger.weeks[0]?.overtimeHours).toBe(0);
  });

  it('ranks where the time actually went', () => {
    const breakdown = pmTimeBreakdown(
      [
        pmBlock({ id: 'a', pmWork: 'discovery', hours: 8, actualHours: 11 }),
        pmBlock({ id: 'b', pmWork: 'stakeholder', hours: 8, actualHours: 6 }),
        pmBlock({ id: 'c', pmWork: 'triage', hours: 4, actualHours: 7 }),
      ],
      'pm1',
    );
    expect(breakdown.map((b) => b.type)).toEqual([
      'discovery',
      'triage',
      'stakeholder',
    ]);
    expect(breakdown[0]).toEqual({
      type: 'discovery',
      plannedHours: 8,
      loggedHours: 11,
    });
  });
});
