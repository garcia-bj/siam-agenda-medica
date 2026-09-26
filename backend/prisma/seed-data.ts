import { SPECIALTIES } from '../src/common/constants/specialties.js';

// America/La_Paz es UTC-4 todo el año (no tiene horario de verano).
const OFFSET = '-04:00';
const DAY_MS = 24 * 60 * 60 * 1000;
const SLOTS_PER_DAY = 18;

const PATIENTS = [
  'Ana Pérez', 'Luis Mamani', 'Carla Quispe', 'Jorge Rojas', 'María Flores',
  'Diego Vargas', 'Lucía Choque', 'Pedro Gutiérrez', 'Sofía Condori', 'Miguel Torrez',
  'Valeria Rocha', 'Andrés Castro', 'Paola Limachi', 'Rodrigo Aguilar', 'Daniela Soliz',
];

/** Lunes de la semana de `now` en La Paz, como `Date.UTC` de ese día a las 00:00. */
function mondayOf(now: Date) {
  const local = new Date(now.getTime() + Number.parseInt(OFFSET, 10) * 60 * 60 * 1000);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - daysSinceMonday);
}

/** Citas de ejemplo: semana de `now` + 2 siguientes, lunes a viernes, 3 por día. */
export function buildAppointments(now = new Date()) {
  const monday = mondayOf(now);
  const appointments = [];

  for (let week = 0; week < 3; week++) {
    for (let weekday = 0; weekday < 5; weekday++) {
      const dayIndex = week * 5 + weekday;
      const date = new Date(monday + (week * 7 + weekday) * DAY_MS).toISOString().slice(0, 10);

      for (let i = 0; i < 3; i++) {
        const n = dayIndex * 3 + i;
        // (dayIndex + i) % 4 es distinto para i = 0, 1, 2: nunca se repite especialidad en el mismo día.
        const specialty = SPECIALTIES[(dayIndex + i) % SPECIALTIES.length];
        const slot = (dayIndex * 5 + i * 7) % SLOTS_PER_DAY;
        const hh = String(9 + Math.floor(slot / 2)).padStart(2, '0');
        const mm = slot % 2 ? '30' : '00';
        const startTime = new Date(`${date}T${hh}:${mm}:00${OFFSET}`);
        const cancelled = n % 7 === 3;
        const name = PATIENTS[n % PATIENTS.length];

        appointments.push({
          patientName: name,
          patientEmail: `${name.split(' ')[0].toLowerCase()}${n}@correo.com`,
          specialty,
          startTime,
          endTime: new Date(startTime.getTime() + 30 * 60 * 1000),
          status: cancelled ? 'CANCELLED' : 'ACTIVE',
          cancelledAt: cancelled ? now : null,
        });
      }
    }
  }
  return appointments;
}
