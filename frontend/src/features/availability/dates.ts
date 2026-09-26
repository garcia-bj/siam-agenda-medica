// Fechas de calendario ("YYYY-MM-DD") en la zona de la clínica. Los días se manejan como texto y la
// aritmética se hace en UTC para que el huso del navegador no corra ningún día.

export const CLINIC_TZ = 'America/La_Paz';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const WEEKDAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const toUtc = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
const toYmd = (date: Date) => date.toISOString().slice(0, 10);

/** Hoy en la clínica, aunque el navegador esté en otro huso horario. */
export function todayInClinic(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: CLINIC_TZ }).format(now);
}

export function addDays(ymd: string, days: number): string {
  return toYmd(new Date(toUtc(ymd).getTime() + days * DAY_MS));
}

/** 0 = domingo … 6 = sábado. */
export function weekday(ymd: string): number {
  return toUtc(ymd).getUTCDay();
}

export function isBusinessDay(ymd: string): boolean {
  const day = weekday(ymd);
  return day >= 1 && day <= 5;
}

/** Se puede elegir: día hábil que no está en el pasado. */
export function isSelectable(ymd: string, today: string): boolean {
  return isBusinessDay(ymd) && ymd >= today;
}

/** Primer día elegible desde `from` (inclusive). */
export function nextSelectableDay(from: string): string {
  let day = from;
  while (!isBusinessDay(day)) day = addDays(day, 1);
  return day;
}

const LAST_SLOT = '17:30';

/** Primer día con horarios por delante: hoy, salvo que ya haya pasado la última franja (17:30). */
export function firstBookableDay(now: Date = new Date()): string {
  const today = todayInClinic(now);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: CLINIC_TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now);
  return nextSelectableDay(time > LAST_SLOT ? addDays(today, 1) : today);
}

/** `count` días hábiles consecutivos empezando en `from` (o el siguiente hábil). */
export function businessDaysFrom(from: string, count: number): string[] {
  const days: string[] = [];
  let day = nextSelectableDay(from);
  while (days.length < count) {
    days.push(day);
    day = nextSelectableDay(addDays(day, 1));
  }
  return days;
}

/** Celdas del mes empezando en lunes; completa con días del mes vecino hasta cerrar la semana. */
export function monthGrid(year: number, month: number): string[] {
  const first = toYmd(new Date(Date.UTC(year, month, 1)));
  const last = toYmd(new Date(Date.UTC(year, month + 1, 0)));
  const start = addDays(first, -((weekday(first) + 6) % 7));
  const end = addDays(last, (7 - weekday(last)) % 7);
  const cells: string[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) cells.push(day);
  return cells;
}

export function monthLabel(year: number, month: number): string {
  const name = MONTHS[month];
  return `${name[0].toUpperCase()}${name.slice(1)} ${year}`;
}

/** "Lunes 28 de septiembre" */
export function formatDayLong(ymd: string): string {
  const date = toUtc(ymd);
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} de ${MONTHS[date.getUTCMonth()]}`;
}

/** "Lun" */
export function weekdayShort(ymd: string): string {
  return WEEKDAYS_SHORT[weekday(ymd)];
}

/** "10:00" a partir del ISO de la API, que ya viene con el desfase de la clínica. */
export function slotTime(iso: string): string {
  return iso.slice(11, 16);
}
