import { Test, TestingModule } from '@nestjs/testing';
import { vi } from 'vitest';
import { PrismaService } from '../database/prisma.service.js';
import { ScheduleService } from '../schedule/schedule.service.js';
import { MetricsService } from './metrics.service.js';

describe('MetricsService', () => {
  let service: MetricsService;
  let prismaMock: { appointment: { findMany: ReturnType<typeof vi.fn> } };

  beforeEach(async () => {
    prismaMock = {
      appointment: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        ScheduleService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('Validación de rango de fechas', () => {
    it('lanza 400 si from es posterior a to', async () => {
      await expect(
        service.getSummary({ from: '2026-10-02', to: '2026-09-28' }),
      ).rejects.toMatchObject({
        status: 400,
        response: expect.objectContaining({
          code: 'VALIDATION_ERROR',
        }),
      });
    });

    it('lanza 400 si el rango supera los 92 días', async () => {
      // 2026-01-01 a 2026-04-10 son 99 días
      await expect(
        service.getSummary({ from: '2026-01-01', to: '2026-04-10' }),
      ).rejects.toMatchObject({
        status: 400,
        response: expect.objectContaining({
          code: 'VALIDATION_ERROR',
        }),
      });
    });

    it('acepta un rango de hasta 92 días exactos', async () => {
      // 2026-01-01 a 2026-04-03 son 92 días de diferencia
      const result = await service.getSummary({ from: '2026-01-01', to: '2026-04-03' });
      expect(result.range.from).toBe('2026-01-01');
      expect(result.range.to).toBe('2026-04-03');
    });
  });

  describe('Fechas por defecto (semana actual)', () => {
    it('si no vienen from y to, usa lunes a viernes de la semana actual', async () => {
      // Miércoles 2026-09-30 -> semana del lunes 2026-09-28 al viernes 2026-10-02
      const fakeNow = '2026-09-30T10:00:00-04:00';
      const result = await service.getSummary({}, fakeNow);

      expect(result.range.from).toBe('2026-09-28');
      expect(result.range.to).toBe('2026-10-02');
      expect(result.range.businessDays).toBe(5);
    });
  });

  describe('Cálculos de capacidad y tasas', () => {
    it('calcula capacity, occupancyRate y cancellationRate correctamente con redondeo a 3 decimales', async () => {
      // 5 días hábiles * 18 * 4 especialidades = 360 capacity
      // Simulamos 86 activas y 9 canceladas (como en el ejemplo de la documentación)
      const fakeAppointments = [
        ...Array.from({ length: 86 }, (_, i) => ({
          startTime: new Date('2026-09-28T13:00:00Z'), // 09:00 en La Paz
          specialty: i < 28 ? 'MEDICINA_GENERAL' : 'PEDIATRIA',
          status: 'ACTIVE',
        })),
        ...Array.from({ length: 9 }, (_, i) => ({
          startTime: new Date('2026-09-28T13:30:00Z'),
          specialty: i < 3 ? 'MEDICINA_GENERAL' : 'PEDIATRIA',
          status: 'CANCELLED',
        })),
      ];

      prismaMock.appointment.findMany.mockResolvedValueOnce(fakeAppointments);

      const result = await service.getSummary({
        from: '2026-09-28',
        to: '2026-10-02',
      });

      expect(result.totals.active).toBe(86);
      expect(result.totals.cancelled).toBe(9);
      expect(result.totals.capacity).toBe(360);
      // 86 / 360 = 0.23888... -> 0.239
      expect(result.totals.occupancyRate).toBe(0.239);
      // 9 / (86 + 9) = 9 / 95 = 0.0947... -> 0.095
      expect(result.totals.cancellationRate).toBe(0.095);

      // bySpecialty para MEDICINA_GENERAL
      const medGeneral = result.bySpecialty.find((s) => s.specialty === 'MEDICINA_GENERAL');
      expect(medGeneral).toBeDefined();
      expect(medGeneral?.active).toBe(28);
      expect(medGeneral?.cancelled).toBe(3);
      expect(medGeneral?.capacity).toBe(90);
      // 28 / 90 = 0.3111... -> 0.311
      expect(medGeneral?.occupancyRate).toBe(0.311);
    });

    it('devuelve tasa 0 si el divisor es 0 (sin citas y sin división por cero)', async () => {
      prismaMock.appointment.findMany.mockResolvedValueOnce([]);

      const result = await service.getSummary({
        from: '2026-09-28',
        to: '2026-10-02',
      });

      expect(result.totals.active).toBe(0);
      expect(result.totals.cancelled).toBe(0);
      expect(result.totals.occupancyRate).toBe(0);
      expect(result.totals.cancellationRate).toBe(0);
    });

    it('maneja un rango sin días hábiles (ej: fin de semana) con capacity 0 y tasas en 0', async () => {
      // 2026-10-03 es sábado y 2026-10-04 es domingo
      prismaMock.appointment.findMany.mockResolvedValueOnce([]);

      const result = await service.getSummary({
        from: '2026-10-03',
        to: '2026-10-04',
      });

      expect(result.range.businessDays).toBe(0);
      expect(result.totals.capacity).toBe(0);
      expect(result.totals.occupancyRate).toBe(0);
      expect(result.totals.cancellationRate).toBe(0);
      expect(result.byDay).toEqual([]);
      expect(result.bySpecialty.every((s) => s.capacity === 0 && s.occupancyRate === 0)).toBe(true);
    });
  });

  describe('Filtro por especialidad', () => {
    it('con specialty solo incluye esa especialidad y calcula capacity para 1 especialidad', async () => {
      const result = await service.getSummary({
        from: '2026-09-28',
        to: '2026-10-02',
        specialty: 'PEDIATRIA',
      });

      // 5 días hábiles * 18 * 1 = 90
      expect(result.totals.capacity).toBe(90);
      expect(result.bySpecialty).toHaveLength(1);
      expect(result.bySpecialty[0].specialty).toBe('PEDIATRIA');
      expect(result.bySpecialty[0].capacity).toBe(90);

      expect(prismaMock.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            specialty: 'PEDIATRIA',
          }),
        }),
      );
    });
  });

  describe('Estructura de byDay y byHour', () => {
    it('byDay genera una fila por cada día hábil aunque no tenga citas', async () => {
      prismaMock.appointment.findMany.mockResolvedValueOnce([
        {
          startTime: new Date('2026-09-28T13:00:00Z'), // Lunes 09:00 -04:00
          specialty: 'PEDIATRIA',
          status: 'ACTIVE',
        },
      ]);

      const result = await service.getSummary({
        from: '2026-09-28',
        to: '2026-10-02',
      });

      expect(result.byDay).toHaveLength(5);
      expect(result.byDay.map((d) => d.date)).toEqual([
        '2026-09-28',
        '2026-09-29',
        '2026-09-30',
        '2026-10-01',
        '2026-10-02',
      ]);

      expect(result.byDay[0]).toEqual({ date: '2026-09-28', active: 1, cancelled: 0 });
      expect(result.byDay[1]).toEqual({ date: '2026-09-29', active: 0, cancelled: 0 });
    });

    it('byHour genera 9 filas de 09:00 a 17:00 y agrupa solo citas activas por hora', async () => {
      prismaMock.appointment.findMany.mockResolvedValueOnce([
        // 09:00 y 09:30 caen en 09:00
        {
          startTime: new Date('2026-09-28T13:00:00Z'), // 09:00 local
          specialty: 'PEDIATRIA',
          status: 'ACTIVE',
        },
        {
          startTime: new Date('2026-09-28T13:30:00Z'), // 09:30 local
          specialty: 'CARDIOLOGIA',
          status: 'ACTIVE',
        },
        // 17:30 cae en 17:00
        {
          startTime: new Date('2026-09-28T21:30:00Z'), // 17:30 local
          specialty: 'DERMATOLOGIA',
          status: 'ACTIVE',
        },
        // Cita cancelada no debe sumarse en byHour
        {
          startTime: new Date('2026-09-28T13:00:00Z'), // 09:00 local
          specialty: 'PEDIATRIA',
          status: 'CANCELLED',
        },
      ]);

      const result = await service.getSummary({
        from: '2026-09-28',
        to: '2026-10-02',
      });

      expect(result.byHour).toHaveLength(9);
      expect(result.byHour.map((h) => h.hour)).toEqual([
        '09:00',
        '10:00',
        '11:00',
        '12:00',
        '13:00',
        '14:00',
        '15:00',
        '16:00',
        '17:00',
      ]);

      const h09 = result.byHour.find((h) => h.hour === '09:00');
      const h10 = result.byHour.find((h) => h.hour === '10:00');
      const h17 = result.byHour.find((h) => h.hour === '17:00');

      expect(h09?.active).toBe(2);
      expect(h10?.active).toBe(0);
      expect(h17?.active).toBe(1);
    });
  });
});
