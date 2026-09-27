import { formatDayShort, slotTime } from '@/features/availability/dates';

export function formatAppointmentDate(isoString: string): string {
  return isoString ? formatDayShort(isoString.slice(0, 10)) : '';
}

export function formatAppointmentTime(isoString: string): string {
  if (!isoString) return '';
  return isoString.includes('T') ? slotTime(isoString) : isoString;
}

export function getInitials(name: string): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
