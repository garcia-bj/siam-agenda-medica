import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { SPECIALTIES } from '../src/common/constants/specialties.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

// America/La_Paz es UTC-4 todo el año (no tiene horario de verano).
const OFFSET = '-04:00';
const DAY_MS = 24 * 60 * 60 * 1000;
const SLOTS_PER_DAY = 18;

const PATIENTS = [
  'Ana Pérez', 'Luis Mamani', 'Carla Quispe', 'Jorge Rojas', 'María Flores',
  'Diego Vargas', 'Lucía Choque', 'Pedro Gutiérrez', 'Sofía Condori', 'Miguel Torrez',
  'Valeria Rocha', 'Andrés Castro', 'Paola Limachi', 'Rodrigo Aguilar', 'Daniela Soliz',
];

const url = process.env.DATABASE_URL;
if (!url) throw new Error('Falta DATABASE_URL en el entorno');
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

/** Lunes de la semana actual en La Paz, como `Date.UTC` de ese día a las 00:00. */
function mondayOfThisWeek() {
  const local = new Date(Date.now() + Number.parseInt(OFFSET, 10) * 60 * 60 * 1000);
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - daysSinceMonday);
}

function buildAppointments() {
  const monday = mondayOfThisWeek();
  const appointments = [];

  // Semana actual + 2 siguientes, lunes a viernes, 3 citas por día.
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
          cancelledAt: cancelled ? new Date() : null,
        });
      }
    }
  }
  return appointments;
}

async function main() {
  await prisma.appointment.deleteMany();
  await prisma.appointment.createMany({ data: buildAppointments() });
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
