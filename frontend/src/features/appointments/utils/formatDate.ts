const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS_SPANISH_SHORT = [
  'ene', 'feb', 'mar', 'abr', 'may', 'jun',
  'jul', 'ago', 'sep', 'oct', 'nov', 'dic',
];

export function formatAppointmentDate(isoString: string): string {
  if (!isoString) return '';
  const datePart = isoString.split('T')[0];
  if (datePart && datePart.length === 10) {
    const [yearStr, monthStr, dayStr] = datePart.split('-');
    const year = parseInt(yearStr, 10);
    const monthIndex = parseInt(monthStr, 10) - 1;
    const day = parseInt(dayStr, 10);
    if (!isNaN(year) && !isNaN(monthIndex) && !isNaN(day)) {
      const utcDate = new Date(Date.UTC(year, monthIndex, day));
      const dayOfWeek = WEEKDAYS_SHORT[utcDate.getUTCDay()];
      const monthName = MONTHS_SPANISH_SHORT[monthIndex] || '';
      return `${dayOfWeek} ${day} ${monthName} ${year}`;
    }
  }
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  const dayOfWeek = WEEKDAYS_SHORT[date.getDay()];
  const day = date.getDate();
  const monthName = MONTHS_SPANISH_SHORT[date.getMonth()];
  const year = date.getFullYear();
  return `${dayOfWeek} ${day} ${monthName} ${year}`;
}

export function formatAppointmentTime(isoString: string): string {
  if (!isoString) return '';
  if (isoString.includes('T')) {
    const timePart = isoString.split('T')[1];
    return timePart.substring(0, 5);
  }
  return isoString;
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
