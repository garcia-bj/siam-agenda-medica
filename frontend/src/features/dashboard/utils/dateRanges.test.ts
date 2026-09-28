import { describe, it, expect } from 'vitest';
import { findPeakHour } from './dateRanges';

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
