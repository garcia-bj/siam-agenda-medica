import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { PrismaService } from '../database/prisma.service.js';
import { ScheduleService } from '../schedule/schedule.service.js';
import { AvailabilityService } from './availability.service.js';

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let prismaMock: { appointment: { findMany: ReturnType<typeof vi.fn> } };

  beforeEach(async () => {
    prismaMock = {
      appointment: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        ScheduleService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('Días no laborables (fin de semana)', () => {
    it('retorna isBusinessDay: false y slots: [] un sábado sin consultar la BD', async () => {
      // 2026-09-26 es sábado
      const result = await service.getDay({ date: '2026-09-26' });

      expect(result).toEqual({
        date: '2026-09-26',
        isBusinessDay: false,
        slots: [],
      });
      expect(prismaMock.appointment.findMany).not.toHaveBeenCalled();
    });

    it('retorna isBusinessDay: false y slots: [] un domingo sin consultar la BD', async () => {
      // 2026-09-27 es domingo
      const result = await service.getDay({ date: '2026-09-27' });

      expect(result).toEqual({
        date: '2026-09-27',
        isBusinessDay: false,
        slots: [],
      });
      expect(prismaMock.appointment.findMany).not.toHaveBeenCalled();
    });
  });

  describe('Validación de fecha', () => {
    it('lanza ApiException 400 si la fecha calendario es inválida', async () => {
      await expect(
        service.getDay({ date: '2026-02-31' }),
      ).rejects.toMatchObject({
        status: 400,
        response: expect.objectContaining({
          code: 'VALIDATION_ERROR',
        }),
      });
      expect(prismaMock.appointment.findMany).not.toHaveBeenCalled();
    });
  });

  describe('Días hábiles y especialidades', () => {
    it('devuelve 72 slots (18 por cada una de las 4 especialidades) en un lunes sin filtro', async () => {
      // 2026-09-28 es lunes
      const result = await service.getDay(
        { date: '2026-09-28' },
        '2026-09-01T00:00:00-04:00',
      );

      expect(result.isBusinessDay).toBe(true);
      expect(result.date).toBe('2026-09-28');
      expect(result.slots).toHaveLength(72);

      const specialties = new Set(result.slots.map((s) => s.specialty));
      expect(specialties).toEqual(
        new Set([
          'MEDICINA_GENERAL',
          'PEDIATRIA',
          'CARDIOLOGIA',
          'DERMATOLOGIA',
        ]),
      );
      expect(
        result.slots.filter((s) => s.specialty === 'PEDIATRIA'),
      ).toHaveLength(18);
      expect(result.slots.every((s) => s.available)).toBe(true);
    });

    it('con &specialty=PEDIATRIA solo devuelve los 18 slots de Pediatría', async () => {
      const result = await service.getDay(
        { date: '2026-09-28', specialty: 'PEDIATRIA' },
        '2026-09-01T00:00:00-04:00',
      );

      expect(result.isBusinessDay).toBe(true);
      expect(result.slots).toHaveLength(18);
      expect(result.slots.every((s) => s.specialty === 'PEDIATRIA')).toBe(true);
      expect(prismaMock.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            specialty: 'PEDIATRIA',
            status: 'ACTIVE',
          }),
        }),
      );
    });
  });

  describe('Cruce de slots con citas ocupadas y pasadas', () => {
    it('cruza citas ACTIVE y marca los slots correspondientes con available: false', async () => {
      // Simulamos una cita activa para PEDIATRIA a las 09:00 (-04:00)
      // 09:00 en UTC-4 equivale a 13:00 UTC
      const occupiedTime = new Date('2026-09-28T13:00:00Z');
      prismaMock.appointment.findMany.mockResolvedValueOnce([
        {
          specialty: 'PEDIATRIA',
          startTime: occupiedTime,
        },
      ]);

      const result = await service.getDay(
        { date: '2026-09-28', specialty: 'PEDIATRIA' },
        '2026-09-01T00:00:00-04:00',
      );

      expect(result.slots).toHaveLength(18);

      const slot900 = result.slots.find(
        (s) =>
          s.startTime === '2026-09-28T09:00:00-04:00' &&
          s.specialty === 'PEDIATRIA',
      );
      const slot930 = result.slots.find(
        (s) =>
          s.startTime === '2026-09-28T09:30:00-04:00' &&
          s.specialty === 'PEDIATRIA',
      );

      expect(slot900).toBeDefined();
      expect(slot900?.available).toBe(false);

      expect(slot930).toBeDefined();
      expect(slot930?.available).toBe(true);
    });

    it('realiza una sola query a la base de datos con status: ACTIVE y rango del día', async () => {
      await service.getDay({ date: '2026-09-28' }, '2026-09-01T00:00:00-04:00');

      expect(prismaMock.appointment.findMany).toHaveBeenCalledTimes(1);
      const callArgs = prismaMock.appointment.findMany.mock.calls[0][0];

      expect(callArgs.where.status).toBe('ACTIVE');
      expect(callArgs.where.startTime.gte).toBeInstanceOf(Date);
      expect(callArgs.where.startTime.lte).toBeInstanceOf(Date);
    });

    it('los slots pasados vienen con available: false', async () => {
      // Si now es 2026-09-28 a las 10:00:00-04:00
      // Los slots de 09:00 y 09:30 deben venir con available: false
      // El slot de 10:00 en adelante debe ser available: true
      const now = '2026-09-28T10:00:00-04:00';
      const result = await service.getDay(
        { date: '2026-09-28', specialty: 'CARDIOLOGIA' },
        now,
      );

      const slot900 = result.slots.find(
        (s) => s.startTime === '2026-09-28T09:00:00-04:00',
      );
      const slot930 = result.slots.find(
        (s) => s.startTime === '2026-09-28T09:30:00-04:00',
      );
      const slot1000 = result.slots.find(
        (s) => s.startTime === '2026-09-28T10:00:00-04:00',
      );

      expect(slot900?.available).toBe(false);
      expect(slot930?.available).toBe(false);
      expect(slot1000?.available).toBe(true);
    });
  });
});
