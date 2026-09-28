import { describe, it, expect } from 'vitest';
import { findPeakHour, currentWeekRange, currentMonthRange, formatRange } from './dateRanges';

describe('findPeakHour', () => {
  it('returns the entry with the highest active count', () => {
    const data = [
      { hour: '09:00', active: 8 },
      { hour: '10:00', active: 15 },
      { hour: '11:00', active: 12 },
      { hour: '14:00', active: 10 },
    ];

    const result = findPeakHour(data);
    expect(result).toEqual({ hour: '10:00', active: 15 });
  });

  it('returns the first entry when all have the same count', () => {
    const data = [
      { hour: '09:00', active: 5 },
      { hour: '10:00', active: 5 },
      { hour: '11:00', active: 5 },
    ];

    const result = findPeakHour(data);
    expect(result).toEqual({ hour: '09:00', active: 5 });
  });

  it('returns null for empty data', () => {
    expect(findPeakHour([])).toBeNull();
  });

  it('handles a single entry', () => {
    const data = [{ hour: '14:00', active: 3 }];
    expect(findPeakHour(data)).toEqual({ hour: '14:00', active: 3 });
  });
});

describe('currentWeekRange', () => {
  it('returns Monday-Friday of the week when now is Sunday', () => {
    // 2026-09-27 is a Sunday. The week should be Mon 2026-09-21 to Fri 2026-09-25.
    const sunday = new Date('2026-09-27T12:00:00Z');
    const result = currentWeekRange(sunday);
    expect(result.from).toBe('2026-09-21');
    expect(result.to).toBe('2026-09-25');
  });
});

describe('currentMonthRange', () => {
  it('returns the first and last day of the correct month', () => {
    // 2026-09-27
    const day = new Date('2026-09-27T12:00:00Z');
    const result = currentMonthRange(day);
    expect(result.from).toBe('2026-09-01');
    expect(result.to).toBe('2026-09-30');
  });
});

describe('formatRange', () => {
  it('formats range within the same month correctly', () => {
    const result = formatRange({ from: '2026-09-21', to: '2026-09-25' });
    expect(result).toBe('Lun 21 sept – Vie 25 sept 2026');
  });

  it('formats range spanning different months correctly', () => {
    const result = formatRange({ from: '2026-09-28', to: '2026-10-02' });
    expect(result).toBe('Lun 28 sept – Vie 2 oct 2026');
  });
});
