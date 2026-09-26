export function formatISODate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function businessDaysBetween(fromStr: string, toStr: string): number {
  if (!fromStr || !toStr) return 0;
  const start = new Date(fromStr);
  const end = new Date(toStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return Math.max(1, count);
}

export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(`${dateStr}T12:00:00-04:00`);
  if (isNaN(d.getTime())) return dateStr;
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const dayName = days[d.getDay()];
  const dayNum = d.getDate();
  return `${dayName} ${dayNum}`;
}

export function formatDateRangeLabel(fromStr: string, toStr: string): string {
  if (!fromStr || !toStr) return '';
  const f = new Date(`${fromStr}T12:00:00-04:00`);
  const t = new Date(`${toStr}T12:00:00-04:00`);
  if (isNaN(f.getTime()) || isNaN(t.getTime())) return `${fromStr} - ${toStr}`;

  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  const fDayName = days[f.getDay()];
  const fDayNum = f.getDate();
  const fMonth = months[f.getMonth()];

  const tDayName = days[t.getDay()];
  const tDayNum = t.getDate();
  const tMonth = months[t.getMonth()];
  const year = t.getFullYear();

  if (fMonth === tMonth) {
    return `${fDayName} ${fDayNum} ${fMonth} – ${tDayName} ${tDayNum} ${tMonth} ${year}`;
  }
  return `${fDayName} ${fDayNum} ${fMonth} – ${tDayName} ${tDayNum} ${tMonth} ${year}`;
}
