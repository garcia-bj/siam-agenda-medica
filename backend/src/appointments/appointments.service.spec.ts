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
  const findMany = vi.fn().mockResolvedValue([]);
  const findUnique = vi.fn();
  const update = vi.fn();
  const updateMany = vi.fn();
  const prisma = { appointment: { create, findMany, findUnique, update, updateMany } } as unknown as PrismaService;
  const service = new AppointmentsService(prisma, new ScheduleService());
  return { service, create, findMany, findUnique, update, updateMany };
}

const row = (data: Record<string, unknown>) => ({
  id: 'id-1',
  status: 'ACTIVE',
  cancelledAt: null,
  createdAt: new Date('2030-06-10T13:00:00.000Z'),
  ...data,
});

const stored = (data: Record<string, unknown> = {}) =>
  row({
    patientName: 'Ana Pérez',
    patientEmail: 'ana@correo.com',
    specialty: 'PEDIATRIA',
    startTime: new Date('2030-06-17T14:00:00.000Z'),
    endTime: new Date('2030-06-17T14:30:00.000Z'),
    ...data,
  });

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('error de prueba', { code, clientVersion: '7.10.0' });

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
    create.mockRejectedValue(prismaError('P2002'));

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

describe('AppointmentsService.findAll', () => {
  it('sin filtros trae solo las activas, ordenadas por hora', async () => {
    const { service, findMany } = setup();

    await service.findAll({});

    expect(findMany).toHaveBeenCalledWith({ where: { status: 'ACTIVE' }, orderBy: { startTime: 'asc' } });
  });

  it('con status=ALL no filtra por estado', async () => {
    const { service, findMany } = setup();

    await service.findAll({ status: 'ALL', specialty: 'CARDIOLOGIA' });

    expect(findMany.mock.calls[0][0].where).toEqual({ specialty: 'CARDIOLOGIA' });
  });

  it('date filtra por el día en hora de La Paz, no por el día UTC', async () => {
    const { service, findMany } = setup();

    await service.findAll({ date: '2030-06-17', status: 'CANCELLED' });

    expect(findMany.mock.calls[0][0].where).toEqual({
      status: 'CANCELLED',
      startTime: { gte: new Date('2030-06-17T04:00:00.000Z'), lte: new Date('2030-06-18T03:59:59.999Z') },
    });
  });

  it('devuelve { data } con las fechas en hora de La Paz', async () => {
    const { service, findMany } = setup();
    findMany.mockResolvedValue([stored()]);

    const res = await service.findAll({});

    expect(res.data).toHaveLength(1);
    expect(res.data[0].startTime).toBe('2030-06-17T10:00:00-04:00');
  });
});

describe('AppointmentsService.reschedule', () => {
  const NEW_TIME = '2030-06-18T11:30:00-04:00';

  it('mueve la cita activa y recalcula endTime', async () => {
    const { service, findUnique, update } = setup();
    findUnique.mockResolvedValue(stored());
    update.mockImplementation(({ data }: { data: Record<string, unknown> }) => Promise.resolve(stored(data)));

    const res = await service.reschedule('id-1', { startTime: NEW_TIME }, NOW);

    expect(update).toHaveBeenCalledWith({
      where: { id: 'id-1', status: 'ACTIVE' },
      data: { startTime: new Date('2030-06-18T15:30:00.000Z'), endTime: new Date('2030-06-18T16:00:00.000Z') },
    });
    expect(res).toMatchObject({ startTime: NEW_TIME, endTime: '2030-06-18T12:00:00-04:00', specialty: 'PEDIATRIA' });
  });

  it('al mismo horario responde la cita sin escribir en la base', async () => {
    const { service, findUnique, update } = setup();
    findUnique.mockResolvedValue(stored());

    const res = await service.reschedule('id-1', { startTime: '2030-06-17T14:00:00Z' }, NOW);

    expect(update).not.toHaveBeenCalled();
    expect(res.startTime).toBe('2030-06-17T10:00:00-04:00');
  });

  it('404 si la cita no existe', async () => {
    const { service, findUnique } = setup();
    findUnique.mockResolvedValue(null);

    await expectApiError(service.reschedule('nada', { startTime: NEW_TIME }, NOW), 404, 'NOT_FOUND');
  });

  it('409 ALREADY_CANCELLED si la cita está cancelada', async () => {
    const { service, findUnique, update } = setup();
    findUnique.mockResolvedValue(stored({ status: 'CANCELLED' }));

    await expectApiError(service.reschedule('id-1', { startTime: NEW_TIME }, NOW), 409, 'ALREADY_CANCELLED');
    expect(update).not.toHaveBeenCalled();
  });

  it('422 si el nuevo horario está fuera de las reglas', async () => {
    const { service, findUnique, update } = setup();
    findUnique.mockResolvedValue(stored());

    await expectApiError(
      service.reschedule('id-1', { startTime: '2030-06-22T10:00:00-04:00' }, NOW),
      422,
      'OUTSIDE_BUSINESS_HOURS',
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('409 SLOT_TAKEN si el nuevo slot está ocupado (P2002)', async () => {
    const { service, findUnique, update } = setup();
    findUnique.mockResolvedValue(stored());
    update.mockRejectedValue(prismaError('P2002'));

    await expectApiError(service.reschedule('id-1', { startTime: NEW_TIME }, NOW), 409, 'SLOT_TAKEN');
  });

  it('409 ALREADY_CANCELLED si otra petición la canceló en el medio (P2025)', async () => {
    const { service, findUnique, update } = setup();
    findUnique.mockResolvedValue(stored());
    update.mockRejectedValue(prismaError('P2025'));

    await expectApiError(service.reschedule('id-1', { startTime: NEW_TIME }, NOW), 409, 'ALREADY_CANCELLED');
  });
});

describe('AppointmentsService.cancel', () => {
  it('pasa la cita a CANCELLED con cancelledAt, solo si sigue activa', async () => {
    const { service, updateMany, findUnique } = setup();
    updateMany.mockResolvedValue({ count: 1 });

    await service.cancel('id-1');

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'id-1', status: 'ACTIVE' },
      data: { status: 'CANCELLED', cancelledAt: expect.any(Date) },
    });
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('404 si la cita no existe', async () => {
    const { service, updateMany, findUnique } = setup();
    updateMany.mockResolvedValue({ count: 0 });
    findUnique.mockResolvedValue(null);

    await expectApiError(service.cancel('nada'), 404, 'NOT_FOUND');
  });

  it('409 ALREADY_CANCELLED si ya estaba cancelada', async () => {
    const { service, updateMany, findUnique } = setup();
    updateMany.mockResolvedValue({ count: 0 });
    findUnique.mockResolvedValue(stored({ status: 'CANCELLED' }));

    await expectApiError(service.cancel('id-1'), 409, 'ALREADY_CANCELLED');
  });
});
