import { describe, expect, it } from 'vitest';
import { addWeeks, formatWeek, weekRange, weekStartOf, weeksBetween } from '../weeks';

describe('weeks', () => {
  it('snaps any day to the Monday of its week', () => {
    expect(weekStartOf(new Date(2026, 8, 17))).toBe('2026-09-14'); // Thursday
    expect(weekStartOf(new Date(2026, 8, 14))).toBe('2026-09-14'); // Monday itself
    expect(weekStartOf(new Date(2026, 8, 20))).toBe('2026-09-14'); // Sunday
    expect(weekStartOf(new Date(2026, 8, 21))).toBe('2026-09-21'); // next Monday
  });

  it('walks forward and backward in whole weeks', () => {
    expect(addWeeks('2026-09-14', 3)).toBe('2026-10-05');
    expect(addWeeks('2026-09-14', -2)).toBe('2026-08-31');
  });

  it('crosses a month boundary without drifting', () => {
    expect(weekRange(new Date(2026, 8, 17), 4)).toEqual([
      '2026-09-14',
      '2026-09-21',
      '2026-09-28',
      '2026-10-05',
    ]);
  });

  it('counts weeks between two starts', () => {
    expect(weeksBetween('2026-09-14', '2026-10-05')).toBe(3);
    expect(weeksBetween('2026-10-05', '2026-09-14')).toBe(-3);
  });

  it('formats a week for the column header', () => {
    expect(formatWeek('2026-09-14')).toBe('Sep 14');
  });
});
