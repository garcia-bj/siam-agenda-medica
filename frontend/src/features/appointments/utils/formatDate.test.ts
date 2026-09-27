import { describe, expect, it } from 'vitest';
import {
  formatAppointmentDate,
  formatAppointmentTime,
  getInitials,
} from './formatDate';

describe('formatDate utils', () => {
  it('delegates appointment date and time formatting to clinic date helpers', () => {
    expect(formatAppointmentDate('2026-09-28T10:30:00-04:00')).toBe('Lun 28 sep 2026');
    expect(formatAppointmentTime('2026-09-28T10:30:00-04:00')).toBe('10:30');
  });

  describe('getInitials', () => {
    it('returns first letters of first and last name', () => {
      expect(getInitials('Carlos Méndez')).toBe('CM');
      expect(getInitials('Ana Ruiz')).toBe('AR');
      expect(getInitials('María José García')).toBe('MG');
    });

    it('handles single word name', () => {
      expect(getInitials('Carlos')).toBe('CA');
    });

    it('handles empty string', () => {
      expect(getInitials('')).toBe('');
    });
  });
});
