import { describe, expect, it } from 'vitest';
import {
  formatAppointmentDate,
  formatAppointmentTime,
  getInitials,
} from './formatDate';

describe('formatDate utils', () => {
  describe('formatAppointmentDate', () => {
    it('formats ISO date to local string format (e.g. Lun 28 sep 2026)', () => {
      const formatted = formatAppointmentDate('2026-09-28T10:30:00-04:00');
      expect(formatted).toBe('Lun 28 sep 2026');
    });

    it('handles empty string gracefully', () => {
      expect(formatAppointmentDate('')).toBe('');
    });
  });

  describe('formatAppointmentTime', () => {
    it('extracts HH:mm from ISO timestamp string', () => {
      expect(formatAppointmentTime('2026-09-28T10:30:00-04:00')).toBe('10:30');
      expect(formatAppointmentTime('2026-09-28T09:00:00.000Z')).toBe('09:00');
    });

    it('handles empty string', () => {
      expect(formatAppointmentTime('')).toBe('');
    });
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
