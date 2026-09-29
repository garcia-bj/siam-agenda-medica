import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { setupApp } from '../src/setup-app.js';

// Los 4 médicos que carga la migración 20260928230000_doctors.
const INITIAL = [
  { id: '3f1c2a10-0001-4000-8000-000000000001', name: 'Dr. Martín Gutiérrez', specialty: 'MEDICINA_GENERAL' },
  { id: '3f1c2a10-0002-4000-8000-000000000002', name: 'Dra. Sofía Arce', specialty: 'PEDIATRIA' },
  { id: '3f1c2a10-0003-4000-8000-000000000003', name: 'Dr. Ricardo Salazar', specialty: 'CARDIOLOGIA' },
  { id: '3f1c2a10-0004-4000-8000-000000000004', name: 'Dra. Camila Vega', specialty: 'DERMATOLOGIA' },
];
const [, PEDIATRA, CARDIOLOGO, DERMATOLOGA] = INITIAL;
const MON_10 = '2030-06-17T10:00:00-04:00'; // siempre en el futuro

type DoctorBody = { id: string; name: string; specialty: string; active: boolean; upcomingAppointments: number };

describe('Médicos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  // Vuelve al estado que deja la migración: solo los 4 iniciales, activos y con su nombre.
  beforeEach(async () => {
    await prisma.appointment.deleteMany();
    await prisma.doctor.deleteMany({ where: { id: { notIn: INITIAL.map((d) => d.id) } } });
    for (const { id, name } of INITIAL) await prisma.doctor.update({ where: { id }, data: { name, active: true } });
  });

  afterAll(async () => {
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const list = async () => (await http().get('/api/doctors').expect(200)).body.data as DoctorBody[];
  const patch = (id: string, body: object) => http().patch(`/api/doctors/${id}`).send(body);
  const book = (specialty: string) =>
    http().post('/api/appointments').send({ patientName: 'Ana Pérez', patientEmail: 'ana@correo.com', specialty, startTime: MON_10 }).expect(201);

  it('la migración deja un médico activo por especialidad, en el orden de las especialidades', async () => {
    const data = await list();

    expect(data.map(({ name, specialty, active }) => ({ name, specialty, active }))).toEqual(
      INITIAL.map(({ name, specialty }) => ({ name, specialty, active: true })),
    );
    expect(data[0].upcomingAppointments).toBe(0);
    // Las fechas que puso CURRENT_TIMESTAMP en la migración se leen como fechas válidas.
    expect((data[0] as unknown as { createdAt: string }).createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-04:00$/);
  });

  it('cuenta las citas próximas activas de la especialidad', async () => {
    await book('CARDIOLOGIA');
    const cancelled = (await book('PEDIATRIA')).body as { id: string };
    await http().delete(`/api/appointments/${cancelled.id}`).expect(204);

    const byName = Object.fromEntries((await list()).map((d) => [d.name, d.upcomingAppointments]));

    expect(byName[CARDIOLOGO.name]).toBe(1);
    expect(byName[PEDIATRA.name]).toBe(0);
  });

  it('un solo médico activo por especialidad: crear y reactivar responden 409 SPECIALTY_HAS_DOCTOR', async () => {
    const nueva = { name: '  Dra. Laura Méndez ', specialty: 'DERMATOLOGIA' };
    const taken = await http().post('/api/doctors').send(nueva).expect(409);
    expect(taken.body).toMatchObject({ code: 'SPECIALTY_HAS_DOCTOR', message: 'Dermatología ya tiene un médico activo (Dra. Camila Vega)' });

    await patch(DERMATOLOGA.id, { active: false }).expect(200);
    const created = await http().post('/api/doctors').send(nueva).expect(201);
    expect(created.body).toMatchObject({ name: 'Dra. Laura Méndez', specialty: 'DERMATOLOGIA', active: true, upcomingAppointments: 0 });

    const reactivate = await patch(DERMATOLOGA.id, { active: true }).expect(409);
    expect(reactivate.body.code).toBe('SPECIALTY_HAS_DOCTOR');
  });

  it('no deja desactivar a un médico con citas próximas (409) hasta que se cancelan', async () => {
    const appt = (await book('CARDIOLOGIA')).body as { id: string };

    const blocked = await patch(CARDIOLOGO.id, { active: false }).expect(409);
    expect(blocked.body).toMatchObject({
      code: 'DOCTOR_HAS_APPOINTMENTS',
      message: 'No se puede desactivar a Dr. Ricardo Salazar: tiene 1 cita próxima en Cardiología. Cancélalas primero.',
    });
    expect((await list()).find((d) => d.id === CARDIOLOGO.id)?.active).toBe(true); // la transacción se deshizo

    await http().delete(`/api/appointments/${appt.id}`).expect(204);
    const res = await patch(CARDIOLOGO.id, { active: false }).expect(200);
    expect(res.body).toMatchObject({ active: false, upcomingAppointments: 0 });
  });

  it('las citas pasadas no bloquean la desactivación', async () => {
    await prisma.appointment.create({
      data: {
        patientName: 'Ana Pérez',
        patientEmail: 'ana@correo.com',
        specialty: 'PEDIATRIA',
        startTime: new Date('2020-06-15T14:00:00Z'),
        endTime: new Date('2020-06-15T14:30:00Z'),
      },
    });

    await patch(PEDIATRA.id, { active: false }).expect(200);
  });

  it('cambia el nombre recortando espacios', async () => {
    const res = await patch(PEDIATRA.id, { name: '  Dra. Sofía Arce Rojas ' }).expect(200);
    expect(res.body).toMatchObject({ name: 'Dra. Sofía Arce Rojas', specialty: 'PEDIATRIA', active: true });
  });

  it.each([
    ['POST con nombre de 1 carácter', () => http().post('/api/doctors').send({ name: 'A', specialty: 'PEDIATRIA' })],
    ['POST con especialidad desconocida', () => http().post('/api/doctors').send({ name: 'Dr. X Y', specialty: 'ODONTOLOGIA' })],
    ['PATCH con active como texto', () => patch(PEDIATRA.id, { active: 'no' })],
    ['PATCH intentando cambiar la especialidad', () => patch(PEDIATRA.id, { specialty: 'CARDIOLOGIA' })],
  ])('400 VALIDATION_ERROR: %s', async (_caso, send) => {
    const res = await send().expect(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
  });

  it('404 NOT_FOUND al editar un médico que no existe', async () => {
    const res = await patch('no-existe', { name: 'Dr. X Y' }).expect(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});
