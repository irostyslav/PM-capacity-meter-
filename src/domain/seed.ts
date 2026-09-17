import type { PlanState } from './types';
import { addWeeks, weekStartOf } from './weeks';

/**
 * Example data so the board opens in a realistic working state rather than an
 * empty shell. Marcus's current week is deliberately overcommitted, and one
 * low-confidence block sits at the edge of the horizon so the gate is
 * reachable in two drags.
 */
export function seedState(today: Date): PlanState {
  const w0 = weekStartOf(today);
  const w = (n: number) => addWeeks(w0, n);

  return {
    engineers: [
      { id: 'e1', name: 'Priya Raman', color: '#5F6C7A', weeklyCapacityHours: 30, active: true },
      { id: 'e2', name: 'Marcus Bell', color: '#5F6C7A', weeklyCapacityHours: 30, active: true },
      { id: 'e3', name: 'Dani Okoye', color: '#5F6C7A', weeklyCapacityHours: 24, active: true },
      { id: 'e4', name: 'Tomás Linde', color: '#5F6C7A', weeklyCapacityHours: 30, active: true },
      { id: 'e5', name: 'Ada Choi', color: '#5F6C7A', weeklyCapacityHours: 30, active: true },
    ],
    initiatives: [
      { id: 'i1', title: 'Checkout rewrite', color: 'var(--cat-1)', status: 'active', estimatedHours: 74, triageId: 't1', definitionOfDone: 'Card payments work end to end.' },
      { id: 'i2', title: 'Search relevance', color: 'var(--cat-2)', status: 'active', estimatedHours: 42, triageId: 't2', definitionOfDone: 'Top-3 result click rate beats the current ranker.' },
      { id: 'i3', title: 'Billing migration', color: 'var(--cat-3)', status: 'active', estimatedHours: 68, triageId: 't3', definitionOfDone: 'All accounts read from the new ledger.' },
      { id: 'i4', title: 'Mobile onboarding', color: 'var(--cat-4)', status: 'active', estimatedHours: 76, triageId: 't4', definitionOfDone: 'A new account reaches first value on a phone.' },
    ],
    blocks: [
      b('b1', 'e1', w(0), 'i1', 16, 'high', 'delivery', 12),
      { ...b('b2', 'e1', w(0), null, 6, 'high', 'protected', 6), label: 'Discovery writing' },
      b('b3', 'e1', w(1), 'i1', 18, 'high'),
      b('b4', 'e1', w(2), 'i1', 16, 'medium'),
      b('b5', 'e1', w(3), 'i1', 12, 'medium'),
      b('b6', 'e2', w(0), 'i3', 22, 'medium', 'delivery', 20),
      b('b7', 'e2', w(0), 'i1', 12, 'high', 'delivery', 10),
      b('b8', 'e2', w(1), 'i3', 20, 'medium'),
      b('b9', 'e2', w(2), 'i3', 14, 'low'),
      {
        ...b('b10', 'e3', w(0), 'i2', 10, 'medium', 'spike', 8),
        spike: { timeboxDays: 3, brief: '', briefSubmittedAt: null, initiatedBy: 'engineer' },
      },
      b('b11', 'e3', w(0), 'i2', 8, 'high', 'delivery', 7),
      b('b12', 'e3', w(1), 'i2', 14, 'medium'),
      b('b13', 'e3', w(2), 'i2', 10, 'medium'),
      b('b14', 'e4', w(0), 'i4', 18, 'high', 'delivery', 17),
      b('b15', 'e4', w(1), 'i4', 16, 'high'),
      b('b16', 'e4', w(2), 'i4', 12, 'medium'),
      b('b17', 'e4', w(3), 'i4', 10, 'medium'),
      b('b18', 'e5', w(0), 'i3', 12, 'high', 'delivery', 11),
      {
        ...b('b19', 'e5', w(0), 'i4', 8, 'medium', 'spike', 6),
        spike: { timeboxDays: 2, brief: '', briefSubmittedAt: null, initiatedBy: 'pm' },
      },
      b('b20', 'e5', w(1), 'i4', 12, 'medium'),
      { ...b('b21', 'e5', w(2), null, 8, 'high', 'protected', 0), label: 'Architecture brief' },
    ],
    parkingLot: [
      { id: 'p1', title: 'Vendor invoicing edge cases', oneLineDefinition: '', addedAt: addWeeks(w0, -3), triageId: null, estimatedHours: null, spikeBlockId: null },
      { id: 'p2', title: 'Search filters redesign', oneLineDefinition: '', addedAt: addWeeks(w0, -9), triageId: null, estimatedHours: null, spikeBlockId: null },
      { id: 'p3', title: 'Notification preferences', oneLineDefinition: 'A settings page where someone picks which emails they get.', addedAt: addWeeks(w0, -2), triageId: null, estimatedHours: 12, spikeBlockId: null },
    ],
    triages: [],
    log: [
      { id: 'l1', timestamp: addWeeks(w0, -1), requester: 'Finance', initiativeId: 'i3', action: 'committed', whatWasCut: 'Mobile onboarding slips one week', note: '' },
      { id: 'l2', timestamp: addWeeks(w0, -1), requester: 'Sales', initiativeId: null, action: 'declined', whatWasCut: 'nothing — did not clear triage question 2', note: 'Realtime revenue dashboard' },
      { id: 'l3', timestamp: w0, requester: 'Support', initiativeId: null, action: 'deferred', whatWasCut: 'parked until someone can define it in one line', note: 'Bulk refund tool' },
    ],
    resets: [],
  };
}

function b(
  id: string,
  engineerId: string,
  weekStart: string,
  initiativeId: string | null,
  hours: number,
  confidence: 'high' | 'medium' | 'low',
  kind: 'delivery' | 'spike' | 'protected' = 'delivery',
  actualHours = 0,
) {
  return { id, engineerId, initiativeId, weekStart, hours, confidence, kind, actualHours };
}
