import { describe, expect, it } from 'vitest';
import { appointmentDate, appointmentTime } from './AppointmentList';

describe('AppointmentList date helpers', () => {
  it('formats clinic date in Spanish', () => {
    expect(appointmentDate('2026-09-28T10:30:00-04:00')).toBe('Lun 28 sep 2026');
  });

  it('formats clinic time', () => {
    expect(appointmentTime('2026-09-28T10:30:00-04:00')).toBe('10:30');
  });
});
