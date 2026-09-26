import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { buildAppointments } from './seed-data.js';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('Falta DATABASE_URL en el entorno');
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

async function main() {
  await prisma.appointment.deleteMany();
  await prisma.appointment.createMany({ data: buildAppointments() });
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
