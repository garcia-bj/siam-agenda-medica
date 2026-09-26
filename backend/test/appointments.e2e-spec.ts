import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { setupApp } from '../src/setup-app.js';

// 2030-06-17 es lunes: siempre en el futuro para estos tests
const body = {
  patientName: 'Ana Pérez',
  patientEmail: 'ana@correo.com',
  specialty: 'PEDIATRIA',
  startTime: '2030-06-17T10:00:00-04:00',
};

describe('POST /api/appointments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.appointment.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  const post = (data: object) => request(app.getHttpServer()).post('/api/appointments').send(data);

  it('201: crea la cita con endTime +30 min y fechas en hora de La Paz', async () => {
    const res = await post(body).expect(201);

    expect(res.body).toMatchObject({
      ...body,
      endTime: '2030-06-17T10:30:00-04:00',
      status: 'ACTIVE',
      cancelledAt: null,
    });
    expect(res.body.id).toEqual(expect.any(String));
    expect(res.body.createdAt).toMatch(/-04:00$/);
  });

  it('la cita creada ocupa el slot en GET /availability', async () => {
    await post(body).expect(201);

    const res = await request(app.getHttpServer()).get('/api/availability?date=2030-06-17&specialty=PEDIATRIA').expect(200);
    const slot = res.body.slots.find((s: { startTime: string }) => s.startTime === body.startTime);
    expect(slot.available).toBe(false);
  });

  it('409 SLOT_TAKEN si el slot ya está reservado en esa especialidad', async () => {
    await post(body).expect(201);

    const res = await post({ ...body, patientName: 'Luis Mamani', patientEmail: 'luis@correo.com' }).expect(409);
    expect(res.body).toEqual({
      statusCode: 409,
      code: 'SLOT_TAKEN',
      message: 'El horario ya está ocupado para Pediatría',
      details: [],
    });
  });

  it('201 en la misma hora para otra especialidad', async () => {
    await post(body).expect(201);
    await post({ ...body, specialty: 'CARDIOLOGIA' }).expect(201);
  });

  it('201 en un slot que solo tiene una cita cancelada', async () => {
    const first = await post(body).expect(201);
    await prisma.appointment.update({ where: { id: first.body.id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });

    await post(body).expect(201);
  });

  it('10 reservas simultáneas al mismo slot: exactamente 1 recibe 201 y 9 reciben 409', async () => {
    const responses = await Promise.all(
      Array.from({ length: 10 }, (_, i) => post({ ...body, patientEmail: `p${i}@correo.com` })),
    );

    const statuses = responses.map((r) => r.status).sort((a, b) => a - b);
    expect(statuses).toEqual([201, ...Array(9).fill(409)]);
    expect(responses.filter((r) => r.status === 409).every((r) => r.body.code === 'SLOT_TAKEN')).toBe(true);
    expect(await prisma.appointment.count()).toBe(1);
  });

  it.each([
    ['sábado', '2030-06-22T10:00:00-04:00'],
    ['18:00', '2030-06-17T18:00:00-04:00'],
    ['minuto 15', '2030-06-17T10:15:00-04:00'],
    ['fecha pasada', '2020-06-15T10:00:00-04:00'],
  ])('422 OUTSIDE_BUSINESS_HOURS: %s', async (_caso, startTime) => {
    const res = await post({ ...body, startTime }).expect(422);
    expect(res.body.code).toBe('OUTSIDE_BUSINESS_HOURS');
  });

  it.each([
    ['email inválido', { ...body, patientEmail: 'no-es-email' }, 'patientEmail', 'Debe ser un email válido'],
    ['nombre corto', { ...body, patientName: 'A' }, 'patientName', 'El nombre debe tener entre 2 y 100 caracteres'],
    ['fecha sin zona horaria', { ...body, startTime: '2030-06-17T10:00:00' }, 'startTime', 'La fecha y hora de inicio debe incluir la zona horaria (ej. -04:00)'],
    ['campo de más', { ...body, status: 'CANCELLED' }, 'status', 'Campo no permitido'],
  ])('400 VALIDATION_ERROR: %s', async (_caso, data, field, message) => {
    const res = await post(data).expect(400);
    expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR', message: 'Datos inválidos' });
    expect(res.body.details).toContainEqual({ field, message });
  });

  it('400 con un detalle por cada campo faltante', async () => {
    const res = await post({}).expect(400);
    const fields = new Set(res.body.details.map((d: { field: string }) => d.field));
    expect([...fields].sort((a, b) => String(a).localeCompare(String(b)))).toEqual(['patientEmail', 'patientName', 'specialty', 'startTime']);
  });
});
