import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { setupApp } from '../src/setup-app.js';

describe('Disponibilidad de slots (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

  describe('GET /api/availability', () => {
    it('devuelve los slots de las 4 especialidades con available correcto (72 slots)', async () => {
      // 2030-06-17 es lunes
      const res = await request(app.getHttpServer())
        .get('/api/availability?date=2030-06-17')
        .expect(200);

      expect(res.body).toMatchObject({
        date: '2030-06-17',
        isBusinessDay: true,
      });
      expect(res.body.slots).toHaveLength(72);

      const specialties = [
        ...new Set(
          res.body.slots.map((s: { specialty: string }) => s.specialty),
        ),
      ];
      expect(specialties).toEqual([
        'MEDICINA_GENERAL',
        'PEDIATRIA',
        'CARDIOLOGIA',
        'DERMATOLOGIA',
      ]);

      // Al ser una fecha futura sin citas, todos los slots deben estar disponibles
      expect(
        res.body.slots.every(
          (s: { available: boolean }) => s.available === true,
        ),
      ).toBe(true);

      // Verificar orden: startTime y dentro de la hora por especialidad
      const firstSlot = res.body.slots[0];
      expect(firstSlot).toMatchObject({
        specialty: 'MEDICINA_GENERAL',
        startTime: '2030-06-17T09:00:00-04:00',
        endTime: '2030-06-17T09:30:00-04:00',
        available: true,
      });
    });

    it('con &specialty=PEDIATRIA solo devuelve los 18 slots de Pediatría', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/availability?date=2030-06-17&specialty=PEDIATRIA')
        .expect(200);

      expect(res.body).toMatchObject({
        date: '2030-06-17',
        isBusinessDay: true,
      });
      expect(res.body.slots).toHaveLength(18);
      expect(
        res.body.slots.every(
          (s: { specialty: string }) => s.specialty === 'PEDIATRIA',
        ),
      ).toBe(true);
    });

    it('un sábado devuelve 200 con isBusinessDay: false y slots: []', async () => {
      // 2030-06-22 es sábado
      const res = await request(app.getHttpServer())
        .get('/api/availability?date=2030-06-22')
        .expect(200);

      expect(res.body).toEqual({
        date: '2030-06-22',
        isBusinessDay: false,
        slots: [],
      });
    });

    it('un domingo devuelve 200 con isBusinessDay: false y slots: []', async () => {
      // 2030-06-23 es domingo
      const res = await request(app.getHttpServer())
        .get('/api/availability?date=2030-06-23')
        .expect(200);

      expect(res.body).toEqual({
        date: '2030-06-23',
        isBusinessDay: false,
        slots: [],
      });
    });

    it('una fecha con formato inválido devuelve 400 VALIDATION_ERROR', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/availability?date=invalido')
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: 'Datos inválidos',
      });
      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'date' })]),
      );
    });

    it('una fecha calendario no existente devuelve 400 VALIDATION_ERROR', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/availability?date=2030-02-31')
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
    });

    it('si falta el parámetro date devuelve 400 VALIDATION_ERROR', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/availability')
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'date' })]),
      );
    });

    it('una especialidad inválida devuelve 400 VALIDATION_ERROR', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/availability?date=2030-06-17&specialty=NEUROLOGIA')
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'specialty' }),
        ]),
      );
    });

    it('un parámetro desconocido devuelve 400 VALIDATION_ERROR', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/availability?date=2030-06-17&foo=bar')
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          { field: 'foo', message: 'Campo no permitido' },
        ]),
      );
    });

    it('los slots pasados vienen con available: false', async () => {
      // 2020-01-06 fue lunes en el pasado
      const res = await request(app.getHttpServer())
        .get('/api/availability?date=2020-01-06')
        .expect(200);

      expect(res.body.isBusinessDay).toBe(true);
      expect(res.body.slots).toHaveLength(72);
      expect(
        res.body.slots.every(
          (s: { available: boolean }) => s.available === false,
        ),
      ).toBe(true);
    });

    it('cruza con citas ACTIVE marcándolas con available: false y respetando citas CANCELLED', async () => {
      // 2030-06-17 09:00 (-04:00) es 2030-06-17 13:00 UTC
      await prisma.appointment.create({
        data: {
          patientName: 'Paciente Activo',
          patientEmail: 'activo@correo.com',
          specialty: 'PEDIATRIA',
          startTime: new Date('2030-06-17T13:00:00Z'),
          endTime: new Date('2030-06-17T13:30:00Z'),
          status: 'ACTIVE',
        },
      });

      // Otra cita cancelada en el turno de 09:30 (-04:00 -> 13:30 UTC)
      await prisma.appointment.create({
        data: {
          patientName: 'Paciente Cancelado',
          patientEmail: 'cancelado@correo.com',
          specialty: 'PEDIATRIA',
          startTime: new Date('2030-06-17T13:30:00Z'),
          endTime: new Date('2030-06-17T14:00:00Z'),
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      const res = await request(app.getHttpServer())
        .get('/api/availability?date=2030-06-17&specialty=PEDIATRIA')
        .expect(200);

      const slot900 = res.body.slots.find(
        (s: { startTime: string }) =>
          s.startTime === '2030-06-17T09:00:00-04:00',
      );
      const slot930 = res.body.slots.find(
        (s: { startTime: string }) =>
          s.startTime === '2030-06-17T09:30:00-04:00',
      );

      // El slot activo debe estar no disponible
      expect(slot900).toBeDefined();
      expect(slot900.available).toBe(false);

      // El slot con cita cancelada debe estar libre
      expect(slot930).toBeDefined();
      expect(slot930.available).toBe(true);
    });
  });
});
