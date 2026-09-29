import { Prisma } from '../generated/prisma/client.js';
import { ApiException } from '../common/api-exception.js';
import type { PrismaService } from '../database/prisma.service.js';
import { ScheduleService } from '../schedule/schedule.service.js';
import { DoctorsService } from './doctors.service.js';

const NOW = new Date('2030-06-10T13:00:00.000Z');

const row = (data: Record<string, unknown> = {}) => ({
  id: 'doc-1',
  name: 'Dra. Sofía Arce',
  specialty: 'PEDIATRIA',
  active: true,
  createdAt: new Date('2030-06-01T13:00:00.000Z'),
  updatedAt: new Date('2030-06-01T13:00:00.000Z'),
  ...data,
});

function setup() {
  const doctorApi = { findMany: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findFirst: vi.fn() };
  const appointmentApi = { groupBy: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) };
  const prisma = {
    doctor: doctorApi,
    appointment: appointmentApi,
    // La transacción usa el mismo cliente falso; un throw dentro "deshace" porque no guardamos nada.
    $transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
  };
  const service = new DoctorsService(prisma as unknown as PrismaService, new ScheduleService());
  return { service, doctor: doctorApi, appointment: appointmentApi };
}

const p2002 = () => new Prisma.PrismaClientKnownRequestError('único', { code: 'P2002', clientVersion: '7.10.0' });

async function expectApiError(promise: Promise<unknown>, statusCode: number, code: string) {
  const error = await promise.then(() => null, (e: unknown) => e);
  expect(error).toBeInstanceOf(ApiException);
  const body = (error as ApiException).getResponse() as { message: string };
  expect(body).toMatchObject({ statusCode, code });
  return body.message;
}

describe('DoctorsService.findAll', () => {
  it('ordena por especialidad con el activo primero y cuenta citas próximas solo de los activos', async () => {
    const { service, doctor, appointment } = setup();
    doctor.findMany.mockResolvedValue([
      doctor_('Dr. Andrés Paredes', 'CARDIOLOGIA', false),
      doctor_('Dra. Sofía Arce', 'PEDIATRIA', true),
      doctor_('Dr. Ricardo Salazar', 'CARDIOLOGIA', true),
      doctor_('Dr. Martín Gutiérrez', 'MEDICINA_GENERAL', true),
    ]);
    appointment.groupBy.mockResolvedValue([
      { specialty: 'CARDIOLOGIA', _count: { _all: 2 } },
      { specialty: 'PEDIATRIA', _count: { _all: 1 } },
    ]);

    const { data } = await service.findAll(NOW);

    expect(data.map((d) => [d.name, d.upcomingAppointments])).toEqual([
      ['Dr. Martín Gutiérrez', 0],
      ['Dra. Sofía Arce', 1],
      ['Dr. Ricardo Salazar', 2],
      ['Dr. Andrés Paredes', 0],
    ]);
    expect(appointment.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'ACTIVE', startTime: { gte: NOW } } }),
    );
  });

  it('responde las fechas en hora de La Paz', async () => {
    const { service, doctor } = setup();
    doctor.findMany.mockResolvedValue([row()]);

    const { data } = await service.findAll(NOW);

    expect(data[0]).toEqual({
      id: 'doc-1',
      name: 'Dra. Sofía Arce',
      specialty: 'PEDIATRIA',
      active: true,
      upcomingAppointments: 0,
      createdAt: '2030-06-01T09:00:00-04:00',
      updatedAt: '2030-06-01T09:00:00-04:00',
    });
  });
});

describe('DoctorsService.create', () => {
  it('registra un médico activo', async () => {
    const { service, doctor } = setup();
    doctor.create.mockResolvedValue(doctor_('Dra. Laura Méndez', 'DERMATOLOGIA', true));

    const res = await service.create({ name: 'Dra. Laura Méndez', specialty: 'DERMATOLOGIA' });

    expect(doctor.create).toHaveBeenCalledWith({ data: { name: 'Dra. Laura Méndez', specialty: 'DERMATOLOGIA' } });
    expect(res).toMatchObject({ name: 'Dra. Laura Méndez', active: true, upcomingAppointments: 0 });
  });

  it('409 SPECIALTY_HAS_DOCTOR, nombrando al médico activo, si el índice parcial rechaza el insert', async () => {
    const { service, doctor } = setup();
    doctor.create.mockRejectedValue(p2002());
    doctor.findFirst.mockResolvedValue(row());

    const message = await expectApiError(
      service.create({ name: 'Dra. Laura Méndez', specialty: 'PEDIATRIA' }),
      409,
      'SPECIALTY_HAS_DOCTOR',
    );
    expect(message).toBe('Pediatría ya tiene un médico activo (Dra. Sofía Arce)');
  });
});

describe('DoctorsService.update', () => {
  it('404 NOT_FOUND si el médico no existe', async () => {
    const { service, doctor } = setup();
    doctor.findUnique.mockResolvedValue(null);

    await expectApiError(service.update('nope', { name: 'X Y' }), 404, 'NOT_FOUND');
  });

  it('cambia el nombre', async () => {
    const { service, doctor } = setup();
    doctor.findUnique.mockResolvedValue(row());
    doctor.update.mockResolvedValue(row({ name: 'Dra. Sofía Arce Rojas' }));

    const res = await service.update('doc-1', { name: 'Dra. Sofía Arce Rojas' }, NOW);

    expect(doctor.update).toHaveBeenCalledWith({ where: { id: 'doc-1' }, data: { name: 'Dra. Sofía Arce Rojas', active: undefined } });
    expect(res.name).toBe('Dra. Sofía Arce Rojas');
  });

  it('desactiva si no tiene citas próximas', async () => {
    const { service, doctor, appointment } = setup();
    doctor.findUnique.mockResolvedValue(row());
    doctor.update.mockResolvedValue(row({ active: false }));
    appointment.count.mockResolvedValue(0);

    const res = await service.update('doc-1', { active: false }, NOW);

    expect(res).toMatchObject({ active: false, upcomingAppointments: 0 });
    // Cuenta solo citas ACTIVE de su especialidad desde ahora: las pasadas y canceladas no bloquean.
    expect(appointment.count).toHaveBeenCalledWith({
      where: { specialty: 'PEDIATRIA', status: 'ACTIVE', startTime: { gte: NOW } },
    });
  });

  it('409 DOCTOR_HAS_APPOINTMENTS si tiene citas próximas, contando después de escribir (misma transacción)', async () => {
    const { service, doctor, appointment } = setup();
    doctor.findUnique.mockResolvedValue(row());
    doctor.update.mockResolvedValue(row({ active: false }));
    appointment.count.mockResolvedValue(2);

    const message = await expectApiError(service.update('doc-1', { active: false }, NOW), 409, 'DOCTOR_HAS_APPOINTMENTS');

    expect(message).toBe('No se puede desactivar a Dra. Sofía Arce: tiene 2 citas próximas en Pediatría. Cancélalas primero.');
    expect(doctor.update.mock.invocationCallOrder[0]).toBeLessThan(appointment.count.mock.invocationCallOrder[0]);
  });

  it('409 SPECIALTY_HAS_DOCTOR al reactivar si la especialidad ya tiene otro activo', async () => {
    const { service, doctor } = setup();
    doctor.findUnique.mockResolvedValue(row({ id: 'doc-2', name: 'Dr. Andrés Paredes', active: false }));
    doctor.update.mockRejectedValue(p2002());
    doctor.findFirst.mockResolvedValue(row());

    await expectApiError(service.update('doc-2', { active: true }, NOW), 409, 'SPECIALTY_HAS_DOCTOR');
  });

  it('reactivar devuelve las citas próximas de su especialidad', async () => {
    const { service, doctor, appointment } = setup();
    doctor.findUnique.mockResolvedValue(row({ active: false }));
    doctor.update.mockResolvedValue(row({ active: true }));
    appointment.count.mockResolvedValue(3);

    const res = await service.update('doc-1', { active: true }, NOW);

    expect(res).toMatchObject({ active: true, upcomingAppointments: 3 });
  });
});

describe('DoctorsService.findActiveBySpecialty', () => {
  it('retorna médicos activos indexados por especialidad en una sola consulta sin N+1', async () => {
    const { service, doctor } = setup();
    doctor.findMany.mockResolvedValue([
      { id: 'doc-1', name: 'Dr. Martín Gutiérrez', specialty: 'MEDICINA_GENERAL' },
      { id: 'doc-2', name: 'Dra. Sofía Arce', specialty: 'PEDIATRIA' },
    ]);

    const map = await service.findActiveBySpecialty();

    expect(doctor.findMany).toHaveBeenCalledTimes(1);
    expect(doctor.findMany).toHaveBeenCalledWith({
      where: { active: true },
      select: { id: true, name: true, specialty: true },
    });
    expect(map.size).toBe(2);
    expect(map.get('MEDICINA_GENERAL')).toEqual({ id: 'doc-1', name: 'Dr. Martín Gutiérrez' });
    expect(map.get('PEDIATRIA')).toEqual({ id: 'doc-2', name: 'Dra. Sofía Arce' });
    expect(map.get('CARDIOLOGIA')).toBeUndefined();
  });

  it('permite filtrar por especialidad o lista de especialidades', async () => {
    const { service, doctor } = setup();
    doctor.findMany.mockResolvedValue([
      { id: 'doc-2', name: 'Dra. Sofía Arce', specialty: 'PEDIATRIA' },
    ]);

    await service.findActiveBySpecialty('PEDIATRIA');
    expect(doctor.findMany).toHaveBeenCalledWith({
      where: { active: true, specialty: 'PEDIATRIA' },
      select: { id: true, name: true, specialty: true },
    });

    await service.findActiveBySpecialty(['PEDIATRIA', 'CARDIOLOGIA']);
    expect(doctor.findMany).toHaveBeenCalledWith({
      where: { active: true, specialty: { in: ['PEDIATRIA', 'CARDIOLOGIA'] } },
      select: { id: true, name: true, specialty: true },
    });
  });
});

function doctor_(name: string, specialty: string, active: boolean) {
  return row({ id: name, name, specialty, active });
}
