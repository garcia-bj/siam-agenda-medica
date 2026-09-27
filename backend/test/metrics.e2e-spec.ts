import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { setupApp } from '../src/setup-app.js';

describe('GET /api/metrics/summary (e2e)', () => {
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

  describe('Cálculos y contrato del endpoint', () => {
    it('200: devuelve range, totals, bySpecialty, byDay y byHour con datos reales de la BD', async () => {
      // 2030-06-17 es lunes, 2030-06-21 es viernes (5 días hábiles)
      // En UTC-4:
      // 09:00 local = 13:00 UTC
      // 09:30 local = 13:30 UTC
      // 17:00 local = 21:00 UTC
      await prisma.appointment.createMany({
        data: [
          // Cita 1: Lunes 09:00 Pediatría (ACTIVE)
          {
            patientName: 'Paciente 1',
            patientEmail: 'p1@correo.com',
            specialty: 'PEDIATRIA',
            startTime: new Date('2030-06-17T13:00:00Z'),
            endTime: new Date('2030-06-17T13:30:00Z'),
            status: 'ACTIVE',
          },
          // Cita 2: Lunes 09:30 Pediatría (ACTIVE)
          {
            patientName: 'Paciente 2',
            patientEmail: 'p2@correo.com',
            specialty: 'PEDIATRIA',
            startTime: new Date('2030-06-17T13:30:00Z'),
            endTime: new Date('2030-06-17T14:00:00Z'),
            status: 'ACTIVE',
          },
          // Cita 3: Lunes 17:00 Medicina General (ACTIVE)
          {
            patientName: 'Paciente 3',
            patientEmail: 'p3@correo.com',
            specialty: 'MEDICINA_GENERAL',
            startTime: new Date('2030-06-17T21:00:00Z'),
            endTime: new Date('2030-06-17T21:30:00Z'),
            status: 'ACTIVE',
          },
          // Cita 4: Martes 10:00 Pediatría (CANCELLED)
          {
            patientName: 'Paciente 4',
            patientEmail: 'p4@correo.com',
            specialty: 'PEDIATRIA',
            startTime: new Date('2030-06-18T14:00:00Z'),
            endTime: new Date('2030-06-18T14:30:00Z'),
            status: 'CANCELLED',
            cancelledAt: new Date(),
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .get('/api/metrics/summary?from=2030-06-17&to=2030-06-21')
        .expect(200);

      // 1. Range
      expect(res.body.range).toEqual({
        from: '2030-06-17',
        to: '2030-06-21',
        businessDays: 5,
      });

      // 2. Totals: 5 días hábiles * 18 * 4 especialidades = 360 capacity
      // active: 3, cancelled: 1
      // occupancyRate: 3 / 360 = 0.008
      // cancellationRate: 1 / 4 = 0.25
      expect(res.body.totals).toEqual({
        active: 3,
        cancelled: 1,
        capacity: 360,
        occupancyRate: 0.008,
        cancellationRate: 0.25,
      });

      // 3. bySpecialty
      expect(res.body.bySpecialty).toHaveLength(4);
      const pedia = res.body.bySpecialty.find(
        (s: { specialty: string }) => s.specialty === 'PEDIATRIA',
      );
      expect(pedia).toEqual({
        specialty: 'PEDIATRIA',
        active: 2,
        cancelled: 1,
        capacity: 90,
        occupancyRate: 0.022, // 2 / 90 = 0.0222... -> 0.022
      });

      const medGen = res.body.bySpecialty.find(
        (s: { specialty: string }) => s.specialty === 'MEDICINA_GENERAL',
      );
      expect(medGen).toEqual({
        specialty: 'MEDICINA_GENERAL',
        active: 1,
        cancelled: 0,
        capacity: 90,
        occupancyRate: 0.011, // 1 / 90 = 0.0111... -> 0.011
      });

      // 4. byDay (5 días hábiles del rango con ceros donde corresponda)
      expect(res.body.byDay).toHaveLength(5);
      expect(res.body.byDay[0]).toEqual({
        date: '2030-06-17',
        active: 3,
        cancelled: 0,
      });
      expect(res.body.byDay[1]).toEqual({
        date: '2030-06-18',
        active: 0,
        cancelled: 1,
      });
      expect(res.body.byDay[2]).toEqual({
        date: '2030-06-19',
        active: 0,
        cancelled: 0,
      });

      // 5. byHour (9 filas de 09:00 a 17:00, solo citas activas)
      expect(res.body.byHour).toHaveLength(9);
      const h09 = res.body.byHour.find((h: { hour: string }) => h.hour === '09:00');
      const h10 = res.body.byHour.find((h: { hour: string }) => h.hour === '10:00');
      const h17 = res.body.byHour.find((h: { hour: string }) => h.hour === '17:00');

      // Las citas de 09:00 y 09:30 caen en 09:00
      expect(h09?.active).toBe(2);
      // La cita de las 10:00 estaba cancelada, no debe contarse
      expect(h10?.active).toBe(0);
      // La cita de las 17:00 activa
      expect(h17?.active).toBe(1);
    });

    it('con &specialty=PEDIATRIA filtra todas las métricas por esa especialidad', async () => {
      await prisma.appointment.createMany({
        data: [
          {
            patientName: 'Pediatría',
            patientEmail: 'ped@correo.com',
            specialty: 'PEDIATRIA',
            startTime: new Date('2030-06-17T13:00:00Z'),
            endTime: new Date('2030-06-17T13:30:00Z'),
            status: 'ACTIVE',
          },
          {
            patientName: 'Cardiología',
            patientEmail: 'cardio@correo.com',
            specialty: 'CARDIOLOGIA',
            startTime: new Date('2030-06-17T13:00:00Z'),
            endTime: new Date('2030-06-17T13:30:00Z'),
            status: 'ACTIVE',
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .get('/api/metrics/summary?from=2030-06-17&to=2030-06-21&specialty=PEDIATRIA')
        .expect(200);

      expect(res.body.totals.capacity).toBe(90); // 5 días * 18 * 1
      expect(res.body.totals.active).toBe(1);
      expect(res.body.bySpecialty).toHaveLength(1);
      expect(res.body.bySpecialty[0].specialty).toBe('PEDIATRIA');
    });

    it('sin from ni to utiliza la semana actual por defecto (lunes a viernes)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/metrics/summary')
        .expect(200);

      expect(res.body.range.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(res.body.range.to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(res.body.range.businessDays).toBe(5);
    });

    it('rango sin días hábiles (fin de semana) devuelve 200 con capacity 0 y byDay vacío', async () => {
      // 2030-06-22 es sábado, 2030-06-23 es domingo
      const res = await request(app.getHttpServer())
        .get('/api/metrics/summary?from=2030-06-22&to=2030-06-23')
        .expect(200);

      expect(res.body.range.businessDays).toBe(0);
      expect(res.body.totals.capacity).toBe(0);
      expect(res.body.totals.occupancyRate).toBe(0);
      expect(res.body.totals.cancellationRate).toBe(0);
      expect(res.body.byDay).toEqual([]);
    });
  });

  describe('Validaciones y errores 400', () => {
    it('400 VALIDATION_ERROR si from es posterior a to (incluye details con field from)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/metrics/summary?from=2030-06-21&to=2030-06-17')
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          { field: 'from', message: 'No puede ser posterior a la fecha final' },
        ]),
      );
    });

    it('400 VALIDATION_ERROR si el rango supera los 92 días inclusivos (incluye details con field to)', async () => {
      // 2030-01-01 a 2030-04-03 son 93 días contando ambos extremos
      const res = await request(app.getHttpServer())
        .get('/api/metrics/summary?from=2030-01-01&to=2030-04-03')
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          { field: 'to', message: 'El rango no puede superar 92 días' },
        ]),
      );
    });

    it('200: acepta un rango de hasta 92 días inclusivos exactos', async () => {
      // 2030-01-01 a 2030-04-02 son 92 días contando ambos extremos
      const res = await request(app.getHttpServer())
        .get('/api/metrics/summary?from=2030-01-01&to=2030-04-02')
        .expect(200);

      expect(res.body.range.from).toBe('2030-01-01');
      expect(res.body.range.to).toBe('2030-04-02');
    });

    it('400 VALIDATION_ERROR si from tiene formato inválido o fecha inexistente', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/metrics/summary?from=2030-02-31&to=2030-03-05')
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'from' })]),
      );
    });

    it('400 VALIDATION_ERROR si to tiene formato inválido o fecha inexistente', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/metrics/summary?from=2030-06-01&to=invalido')
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'to' })]),
      );
    });

    it('400 VALIDATION_ERROR si specialty es inválida', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/metrics/summary?specialty=NEFROLOGIA')
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'specialty' })]),
      );
    });

    it('400 VALIDATION_ERROR si se envía un parámetro no permitido', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/metrics/summary?foo=bar')
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
      expect(res.body.details).toEqual(
        expect.arrayContaining([{ field: 'foo', message: 'Campo no permitido' }]),
      );
    });
  });
});
