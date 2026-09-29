import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { API_URL } from '../playwright.config';

const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];
const DAY_MS = 24 * 60 * 60 * 1000;

const utc = (ymd: string) => new Date(`${ymd}T00:00:00Z`);

/** Hoy en La Paz. */
export function clinicToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/La_Paz' }).format(new Date());
}

/** El próximo día hábil DESPUÉS de hoy: tiene todos sus horarios en el futuro, a cualquier hora del día. */
export function nextBusinessDay(): string {
  let day = utc(clinicToday()).getTime();
  do day += DAY_MS;
  while ([0, 6].includes(new Date(day).getUTCDay()));
  return new Date(day).toISOString().slice(0, 10);
}

/** Nombre accesible de un día en el calendario y en la tira de días: "Martes 29 de septiembre". */
export function dayLabel(ymd: string): string {
  const d = utc(ymd);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()]}`;
}

/** ISO con el desfase de La Paz, como lo espera la API. */
export const at = (ymd: string, hhmm: string) => `${ymd}T${hhmm}:00-04:00`;

/** Crea una cita directo por la API (como si la hiciera otra recepcionista). */
export async function createAppointment(
  request: APIRequestContext,
  data: { patientName: string; patientEmail: string; specialty: string; startTime: string },
) {
  const res = await request.post(`${API_URL}/appointments`, { data });
  expect(res.status(), await res.text()).toBe(201);
  return (await res.json()) as { id: string };
}

/** En la Vista 1: elige especialidad y día (pasando al mes siguiente si hace falta). */
export async function chooseSpecialtyAndDay(page: Page, specialty: string, ymd: string) {
  await page.getByRole('group', { name: 'Especialidad' }).getByRole('button', { name: specialty }).click();
  const day = page.getByRole('button', { name: dayLabel(ymd), exact: true });
  if (!(await day.isVisible())) await page.getByRole('button', { name: 'Mes siguiente' }).click();
  await day.click();
}

/** Guarda una captura de página completa en e2e/capturas/. */
export async function capture(page: Page, name: string) {
  await page.screenshot({ path: `capturas/${name}.png`, fullPage: true });
}
