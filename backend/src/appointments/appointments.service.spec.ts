import { Prisma } from '../generated/prisma/client.js';
import { ApiException } from '../common/api-exception.js';
import type { PrismaService } from '../database/prisma.service.js';
import { ScheduleService } from '../schedule/schedule.service.js';
import { AppointmentsService } from './appointments.service.js';

// Lunes 17 de junio de 2030, 10:00 en La Paz (UTC-4) = 14:00 UTC
const MONDAY_10 = '2030-06-17T10:00:00-04:00';
const NOW = '2030-06-10T09:00:00-04:00';
const dto = { patientName: 'Ana Pérez', patientEmail: 'ana@correo.com', specialty: 'PEDIATRIA' as const, startTime: MONDAY_10 };

function setup() {
  const create = vi.fn();
  const prisma = { appointment: { create } } as unknown as PrismaService;
  const service = new AppointmentsService(prisma, new ScheduleService());
  return { service, create };
}

const row = (data: Record<string, unknown>) => ({
  id: 'id-1',
  status: 'ACTIVE',
  cancelledAt: null,
  createdAt: new Date('2030-06-10T13:00:00.000Z'),
  ...data,
});

async function expectApiError(promise: Promise<unknown>, statusCode: number, code: string) {
  const error = await promise.then(() => null, (e: unknown) => e);
  expect(error).toBeInstanceOf(ApiException);
  expect((error as ApiException).getResponse()).toMatchObject({ statusCode, code });
}

describe('AppointmentsService.create', () => {
  it('guarda startTime y endTime (+30 min) en UTC y responde en hora de La Paz', async () => {
    const { service, create } = setup();
    create.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve(row(data)));

    const res = await service.create(dto, NOW);

    const saved = create.mock.calls[0][0].data;
    expect(saved.startTime).toEqual(new Date('2030-06-17T14:00:00.000Z'));
    expect(saved.endTime).toEqual(new Date('2030-06-17T14:30:00.000Z'));
    expect(res).toEqual({
      id: 'id-1',
      patientName: 'Ana Pérez',
      patientEmail: 'ana@correo.com',
      specialty: 'PEDIATRIA',
      startTime: '2030-06-17T10:00:00-04:00',
      endTime: '2030-06-17T10:30:00-04:00',
      status: 'ACTIVE',
      cancelledAt: null,
      createdAt: '2030-06-10T09:00:00-04:00',
    });
  });

  it('acepta un startTime en UTC y lo guarda como el mismo instante', async () => {
    const { service, create } = setup();
    create.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve(row(data)));

    const res = await service.create({ ...dto, startTime: '2030-06-17T14:00:00Z' }, NOW);

    expect(res.startTime).toBe('2030-06-17T10:00:00-04:00');
  });

  it.each([
    ['sábado', '2030-06-22T10:00:00-04:00'],
    ['18:00', '2030-06-17T18:00:00-04:00'],
    ['08:30', '2030-06-17T08:30:00-04:00'],
    ['minuto 15', '2030-06-17T10:15:00-04:00'],
    ['fecha pasada', '2030-06-03T10:00:00-04:00'],
  ])('rechaza %s con 422 sin tocar la base', async (_caso, startTime) => {
    const { service, create } = setup();

    await expectApiError(service.create({ ...dto, startTime }, NOW), 422, 'OUTSIDE_BUSINESS_HOURS');
    expect(create).not.toHaveBeenCalled();
  });

  it('traduce el P2002 del índice único a 409 SLOT_TAKEN con la especialidad en español', async () => {
    const { service, create } = setup();
    create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: '7.10.0' }));

    const error = await service.create(dto, NOW).catch((e: unknown) => e);

    expect((error as ApiException).getResponse()).toEqual({
      statusCode: 409,
      code: 'SLOT_TAKEN',
      message: 'El horario ya está ocupado para Pediatría',
      details: [],
    });
  });

  it('deja pasar otros errores de la base sin convertirlos en 409', async () => {
    const { service, create } = setup();
    const boom = new Error('disco lleno');
    create.mockRejectedValue(boom);

    await expect(service.create(dto, NOW)).rejects.toBe(boom);
  });
});
