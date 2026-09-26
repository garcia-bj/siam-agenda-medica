import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { setupApp } from '../src/setup-app.js';

// 2030-06-17 es lunes y 2030-06-18 martes: siempre en el futuro para estos tests
const base = { patientName: 'Ana Pérez', patientEmail: 'ana@correo.com', specialty: 'PEDIATRIA' };
const MON_10 = '2030-06-17T10:00:00-04:00';
const MON_09 = '2030-06-17T09:00:00-04:00';
const TUE_11 = '2030-06-18T11:30:00-04:00';

describe('Listar, reprogramar y cancelar citas (e2e)', () => {
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

  const http = () => request(app.getHttpServer());
  const create = async (data: object = {}) =>
    (await http().post('/api/appointments').send({ ...base, startTime: MON_10, ...data }).expect(201)).body as { id: string };

  describe('GET /api/appointments', () => {
    it('devuelve solo las activas, ordenadas por hora, dentro de { data }', async () => {
      await create({ startTime: TUE_11 });
      await create({ startTime: MON_10 });
      const cancelled = await create({ startTime: MON_09 });
      await http().delete(`/api/appointments/${cancelled.id}`).expect(204);

      const res = await http().get('/api/appointments').expect(200);

      expect(res.body.data.map((a: { startTime: string }) => a.startTime)).toEqual([MON_10, TUE_11]);
    });

    it('filtra por especialidad, fecha y estado, solos y combinados', async () => {
      await create({ startTime: MON_10 });
      await create({ startTime: MON_10, specialty: 'CARDIOLOGIA' });
      await create({ startTime: TUE_11 });
      const cancelled = await create({ startTime: MON_09 });
      await http().delete(`/api/appointments/${cancelled.id}`).expect(204);
      const count = async (qs: string) => (await http().get(`/api/appointments?${qs}`).expect(200)).body.data.length;

      expect(await count('specialty=CARDIOLOGIA')).toBe(1);
      expect(await count('date=2030-06-17')).toBe(2);
      expect(await count('date=2030-06-17&specialty=PEDIATRIA')).toBe(1);
      expect(await count('status=CANCELLED')).toBe(1);
      expect(await count('status=ALL')).toBe(4);
      expect(await count('status=ALL&date=2030-06-17&specialty=PEDIATRIA')).toBe(2);
    });

    it.each([['specialty=ODONTOLOGIA'], ['date=2030-02-31'], ['status=PENDING'], ['otro=1']])(
      '400 VALIDATION_ERROR con %s',
      async (qs) => {
        const res = await http().get(`/api/appointments?${qs}`).expect(400);
        expect(res.body.code).toBe('VALIDATION_ERROR');
      },
    );
  });

  describe('PATCH /api/appointments/:id', () => {
    it('200: mueve la cita a un slot libre y recalcula endTime', async () => {
      const { id } = await create();

      const res = await http().patch(`/api/appointments/${id}`).send({ startTime: TUE_11 }).expect(200);

      expect(res.body).toMatchObject({ id, startTime: TUE_11, endTime: '2030-06-18T12:00:00-04:00', specialty: 'PEDIATRIA' });
    });

    it('el slot anterior queda libre y el nuevo ocupado en GET /availability', async () => {
      const { id } = await create();
      await http().patch(`/api/appointments/${id}`).send({ startTime: '2030-06-17T15:00:00-04:00' }).expect(200);

      const res = await http().get('/api/availability?date=2030-06-17&specialty=PEDIATRIA').expect(200);
      const available = (t: string) =>
        res.body.slots.find((s: { startTime: string }) => s.startTime === t).available as boolean;
      expect(available(MON_10)).toBe(true);
      expect(available('2030-06-17T15:00:00-04:00')).toBe(false);
    });

    it('200 sin cambios al reprogramar al mismo horario', async () => {
      const { id } = await create();

      const res = await http().patch(`/api/appointments/${id}`).send({ startTime: MON_10 }).expect(200);

      expect(res.body.startTime).toBe(MON_10);
    });

    it('409 SLOT_TAKEN si el nuevo slot ya está ocupado en esa especialidad', async () => {
      await create({ startTime: TUE_11, patientEmail: 'otro@correo.com' });
      const { id } = await create();

      const res = await http().patch(`/api/appointments/${id}`).send({ startTime: TUE_11 }).expect(409);

      expect(res.body).toMatchObject({ code: 'SLOT_TAKEN', message: 'El horario ya está ocupado para Pediatría' });
    });

    it('422 OUTSIDE_BUSINESS_HOURS si el nuevo horario es sábado', async () => {
      const { id } = await create();

      const res = await http().patch(`/api/appointments/${id}`).send({ startTime: '2030-06-22T10:00:00-04:00' }).expect(422);

      expect(res.body.code).toBe('OUTSIDE_BUSINESS_HOURS');
    });

    it('409 ALREADY_CANCELLED si la cita está cancelada', async () => {
      const { id } = await create();
      await http().delete(`/api/appointments/${id}`).expect(204);

      const res = await http().patch(`/api/appointments/${id}`).send({ startTime: TUE_11 }).expect(409);

      expect(res.body.code).toBe('ALREADY_CANCELLED');
    });

    it('404 NOT_FOUND si la cita no existe', async () => {
      const res = await http().patch('/api/appointments/no-existe').send({ startTime: TUE_11 }).expect(404);

      expect(res.body).toMatchObject({ code: 'NOT_FOUND', message: 'La cita no existe' });
    });

    it('400 si se manda otro campo además de startTime', async () => {
      const { id } = await create();

      const res = await http().patch(`/api/appointments/${id}`).send({ startTime: TUE_11, specialty: 'CARDIOLOGIA' }).expect(400);

      expect(res.body.details).toContainEqual({ field: 'specialty', message: 'Campo no permitido' });
    });
  });

  describe('DELETE /api/appointments/:id', () => {
    it('204: la cita queda CANCELLED con cancelledAt y el slot vuelve a estar libre', async () => {
      const { id } = await create();

      await http().delete(`/api/appointments/${id}`).expect(204, '');

      const [cancelled] = (await http().get('/api/appointments?status=CANCELLED').expect(200)).body.data;
      expect(cancelled).toMatchObject({ id, status: 'CANCELLED' });
      expect(cancelled.cancelledAt).toMatch(/-04:00$/);
      await http().post('/api/appointments').send({ ...base, startTime: MON_10 }).expect(201);
    });

    it('409 ALREADY_CANCELLED al cancelar dos veces', async () => {
      const { id } = await create();
      await http().delete(`/api/appointments/${id}`).expect(204);

      const res = await http().delete(`/api/appointments/${id}`).expect(409);

      expect(res.body.code).toBe('ALREADY_CANCELLED');
    });

    it('404 NOT_FOUND si la cita no existe', async () => {
      const res = await http().delete('/api/appointments/no-existe').expect(404);

      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('5 cancelaciones simultáneas de la misma cita: 1 recibe 204 y 4 reciben 409', async () => {
      const { id } = await create();

      const responses = await Promise.all(Array.from({ length: 5 }, () => http().delete(`/api/appointments/${id}`)));

      expect(responses.map((r) => r.status).sort((a, b) => a - b)).toEqual([204, 409, 409, 409, 409]);
    });
  });
});
