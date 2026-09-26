import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../src/database/database.module.js';
import { PrismaService } from '../src/database/prisma.service.js';

const slot = {
  specialty: 'PEDIATRIA',
  startTime: new Date('2030-01-07T13:00:00Z'),
  endTime: new Date('2030-01-07T13:30:00Z'),
};
const patient = (n: number) => ({ patientName: `Paciente ${n}`, patientEmail: `p${n}@correo.com` });

describe('Base de datos (e2e)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({ imports: [DatabaseModule] }).compile();
    await moduleRef.init();
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.appointment.deleteMany();
  });

  afterAll(async () => {
    await moduleRef.close();
  });

  it('rechaza una segunda cita ACTIVE en la misma especialidad y hora', async () => {
    await prisma.appointment.create({ data: { ...slot, ...patient(1) } });

    await expect(prisma.appointment.create({ data: { ...slot, ...patient(2) } })).rejects.toMatchObject({ code: 'P2002' });
  });

  it('permite una cita ACTIVE en un slot que tiene una CANCELLED', async () => {
    await prisma.appointment.create({ data: { ...slot, ...patient(1), status: 'CANCELLED', cancelledAt: new Date() } });

    await expect(prisma.appointment.create({ data: { ...slot, ...patient(2) } })).resolves.toMatchObject({ status: 'ACTIVE' });
  });

  it('permite la misma hora en otra especialidad', async () => {
    await prisma.appointment.create({ data: { ...slot, ...patient(1) } });

    await expect(
      prisma.appointment.create({ data: { ...slot, ...patient(2), specialty: 'CARDIOLOGIA' } }),
    ).resolves.toBeDefined();
  });

  it('con 10 reservas simultáneas al mismo slot entra una sola y el resto falla por el índice', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, n) => prisma.appointment.create({ data: { ...slot, ...patient(n) } })),
    );

    const rejected = results.filter((r) => r.status === 'rejected');
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(rejected.every((r) => (r.reason as { code?: string }).code === 'P2002')).toBe(true);
  });

  it('abre SQLite en modo WAL', async () => {
    const [row] = await prisma.$queryRawUnsafe<{ journal_mode: string }[]>('PRAGMA journal_mode');

    expect(row.journal_mode).toBe('wal');
  });
});
