import { describe, expect, it } from 'vitest';
import {
  canCompleteSpike,
  canGraduate,
  canPlace,
  canSchedule,
  canSetConfidence,
  isStale,
  isValidTimebox,
  requiresReason,
} from '../rules';
import type {
  Block,
  Initiative,
  ParkingLotItem,
  TriageRecord,
} from '../types';

const TODAY = new Date(2026, 8, 17); // Thu 17 Sep 2026; horizon ends Oct 1

function initiative(over: Partial<Initiative> = {}): Initiative {
  return {
    id: 'i1',
    title: 'Checkout rewrite',
    color: '#2E6FD6',
    status: 'active',
    estimatedHours: 40,
    triageId: 't1',
    definitionOfDone: 'Card payments work end to end.',
    ...over,
  };
}

function triage(over: Partial<TriageRecord> = {}): TriageRecord {
  return {
    id: 't1',
    submittedAt: '2026-09-10',
    requester: 'Finance',
    title: 'Checkout rewrite',
    problem: 'Shoppers drop at payment.',
    costOfDelay: 'Q4 peak traffic arrives with the old flow.',
    successSignal: 'Payment step completion rate.',
    sizable: true,
    whatWeCut: 'Mobile onboarding slips a week.',
    ...over,
  };
}

function parked(over: Partial<ParkingLotItem> = {}): ParkingLotItem {
  return {
    id: 'p1',
    title: 'Vendor invoicing edge cases',
    oneLineDefinition: '',
    addedAt: '2026-09-01',
    triageId: null,
    estimatedHours: null,
    spikeBlockId: null,
    ...over,
  };
}

function block(over: Partial<Block> = {}): Block {
  return {
    id: 'b1',
    engineerId: 'e1',
    initiativeId: 'i1',
    weekStart: '2026-09-14',
    hours: 16,
    confidence: 'medium',
    kind: 'delivery',
    actualHours: 0,
    ...over,
  };
}

describe('the triage gate (F2)', () => {
  it('refuses an initiative that never went through triage', () => {
    const result = canSchedule(initiative({ triageId: null }), undefined);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('untriaged');
  });

  it('refuses work triage marked as not sizable, and offers a way forward', () => {
    const result = canSchedule(initiative(), triage({ sizable: false }));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('not-sizable');
      expect(result.remedies.map((r) => r.id)).toContain('move-to-parking-lot');
    }
  });

  it('allows a triaged, sizable initiative', () => {
    expect(canSchedule(initiative(), triage()).ok).toBe(true);
  });
});

describe('the parking lot graduation gate (F3)', () => {
  it('holds an item that nobody has defined in one line', () => {
    const result = canGraduate(parked());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('undefined-item');
  });

  it('holds a defined item that is still unsized', () => {
    const result = canGraduate(parked({ oneLineDefinition: 'A settings page.' }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('unsized-item');
  });

  it('releases an item once it is defined and sized', () => {
    expect(
      canGraduate(
        parked({ oneLineDefinition: 'A settings page.', estimatedHours: 12 }),
      ).ok,
    ).toBe(true);
  });

  it('releases an item defined with a spike scheduled instead of an estimate', () => {
    expect(
      canGraduate(
        parked({ oneLineDefinition: 'A settings page.', spikeBlockId: 'b9' }),
      ).ok,
    ).toBe(true);
  });

  it('flags an undefined item as stale after eight weeks', () => {
    expect(isStale(parked({ addedAt: '2026-09-01' }), TODAY)).toBe(false);
    expect(isStale(parked({ addedAt: '2026-07-01' }), TODAY)).toBe(true);
  });

  it('never calls a defined item stale, however old it is', () => {
    expect(
      isStale(parked({ addedAt: '2025-01-01', oneLineDefinition: 'Yes.' }), TODAY),
    ).toBe(false);
  });
});

describe('the confidence horizon (F5)', () => {
  it('allows low confidence inside two weeks', () => {
    expect(canPlace('low', '2026-09-14', TODAY).ok).toBe(true);
    expect(canPlace('low', '2026-09-28', TODAY).ok).toBe(true);
  });

  it('refuses low confidence beyond two weeks', () => {
    const result = canPlace('low', '2026-10-05', TODAY);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('low-confidence-beyond-horizon');
  });

  it('always offers a next action rather than a bare refusal', () => {
    const result = canPlace('low', '2026-11-02', TODAY);
    if (result.ok) throw new Error('expected a refusal');
    expect(result.remedies.map((r) => r.id)).toEqual([
      'schedule-spike',
      'move-to-parking-lot',
    ]);
  });

  it('lets medium and high confidence go as far out as you like', () => {
    expect(canPlace('medium', '2027-03-01', TODAY).ok).toBe(true);
    expect(canPlace('high', '2027-03-01', TODAY).ok).toBe(true);
  });

  it('applies the same rule when confidence is lowered in place', () => {
    const far = block({ weekStart: '2026-10-19', confidence: 'medium' });
    expect(canSetConfidence(far, 'low', TODAY).ok).toBe(false);
    expect(canSetConfidence(far, 'high', TODAY).ok).toBe(true);
  });

  it('demands a reason when confidence is raised', () => {
    expect(requiresReason('low', 'high')).toBe(true);
    expect(requiresReason('medium', 'high')).toBe(true);
    expect(requiresReason('high', 'medium')).toBe(false);
    expect(requiresReason('medium', 'medium')).toBe(false);
  });
});

describe('spikes (F4)', () => {
  it('accepts only a two-to-five day timebox', () => {
    expect([1, 2, 3, 4, 5, 6].map(isValidTimebox)).toEqual([
      false, true, true, true, true, false,
    ]);
    expect(isValidTimebox(3.5)).toBe(false);
  });

  it('will not complete a spike without a written brief', () => {
    const spike = block({
      kind: 'spike',
      spike: { timeboxDays: 3, brief: '   ', briefSubmittedAt: null, initiatedBy: 'pm' },
    });
    const result = canCompleteSpike(spike);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('spike-needs-brief');
  });

  it('completes a spike once the brief is written', () => {
    const spike = block({
      kind: 'spike',
      spike: {
        timeboxDays: 3,
        brief: 'The API supports partial refunds. Roughly 12h to wire up.',
        briefSubmittedAt: '2026-09-17',
        initiatedBy: 'engineer',
      },
    });
    expect(canCompleteSpike(spike).ok).toBe(true);
  });
});
