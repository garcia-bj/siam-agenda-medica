import { Test, TestingModule } from '@nestjs/testing';
import { DateTime } from 'luxon';
import { ApiException } from '../common/api-exception.js';
import { SPECIALTIES } from '../common/constants/specialties.js';
import { ScheduleService } from './schedule.service.js';

describe('ScheduleService', () => {
  let service: ScheduleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScheduleService],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
  });

  /** Helper para verificar que una llamada lance 422 con código OUTSIDE_BUSINESS_HOURS */
  function expectOutsideHours(fn: () => void) {
    try {
      fn();
      expect.unreachable('Debería haber lanzado ApiException');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiException);
      const apiError = error as ApiException;
      expect(apiError.getStatus()).toBe(422);
      expect(apiError.getResponse()).toMatchObject({
        code: 'OUTSIDE_BUSINESS_HOURS',
        statusCode: 422,
      });
    }
  }

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(service.clinicTz).toBe('America/La_Paz');
  });

  describe('Criterio 1: En un día hábil se generan 18 slots por especialidad (09:00 a 17:30)', () => {
    // 2026-09-28 es lunes (día hábil)
    const monday = '2026-09-28';
    // Usamos una fecha "now" previa al día de los slots para que todos estén disponibles
    const fixedNow = DateTime.fromISO('2026-09-25T08:00:00-04:00', { setZone: true });

    it('genera exactamente 18 slots cuando se filtra por una especialidad', () => {
      const slots = service.generateSlots(monday, 'PEDIATRIA', fixedNow);

      expect(slots).toHaveLength(18);
      expect(slots.every((s) => s.specialty === 'PEDIATRIA')).toBe(true);

      // Primer slot: 09:00 a 09:30
      expect(slots[0].startTime).toBe('2026-09-28T09:00:00-04:00');
      expect(slots[0].endTime).toBe('2026-09-28T09:30:00-04:00');
      expect(slots[0].available).toBe(true);

      // Último slot: 17:30 a 18:00
      expect(slots[17].startTime).toBe('2026-09-28T17:30:00-04:00');
      expect(slots[17].endTime).toBe('2026-09-28T18:00:00-04:00');
      expect(slots[17].available).toBe(true);
    });

    it('genera 72 slots (18 x 4) cuando no se especifica especialidad', () => {
      const slots = service.generateSlots(monday, undefined, fixedNow);

      expect(slots).toHaveLength(72);

      // Los primeros 4 slots deben corresponder a las 09:00 para cada especialidad en orden
      expect(slots.slice(0, 4).map((s) => s.specialty)).toEqual(SPECIALTIES);
      expect(slots.slice(0, 4).every((s) => s.startTime === '2026-09-28T09:00:00-04:00')).toBe(true);

      // Los últimos 4 slots deben ser de las 17:30 para cada especialidad
      expect(slots.slice(-4).map((s) => s.specialty)).toEqual(SPECIALTIES);
      expect(slots.slice(-4).every((s) => s.startTime === '2026-09-28T17:30:00-04:00')).toBe(true);
    });

    it('los slots van en bloques consecutivos de 30 minutos', () => {
      const slots = service.generateSlots(monday, 'CARDIOLOGIA', fixedNow);

      for (let i = 0; i < slots.length; i++) {
        const start = DateTime.fromISO(slots[i].startTime, { setZone: true });
        const end = DateTime.fromISO(slots[i].endTime, { setZone: true });
        expect(end.diff(start, 'minutes').minutes).toBe(30);

        if (i > 0) {
          const prevStart = DateTime.fromISO(slots[i - 1].startTime, { setZone: true });
          expect(start.diff(prevStart, 'minutes').minutes).toBe(30);
        }
      }
    });
  });

  describe('Criterio 2: Sábado o domingo no se generan slots y la validación falla', () => {
    // 2026-10-03 es sábado, 2026-10-04 es domingo
    const saturday = '2026-10-03';
    const sunday = '2026-10-04';
    const fixedNow = DateTime.fromISO('2026-09-25T08:00:00-04:00', { setZone: true });

    it('generateSlots retorna arreglo vacío en sábado y domingo', () => {
      expect(service.generateSlots(saturday, 'MEDICINA_GENERAL', fixedNow)).toEqual([]);
      expect(service.generateSlots(sunday, 'DERMATOLOGIA', fixedNow)).toEqual([]);
      expect(service.generateSlots(saturday, undefined, fixedNow)).toEqual([]);
      expect(service.generateSlots(sunday, undefined, fixedNow)).toEqual([]);
    });

    it('validateSlot lanza 422 OUTSIDE_BUSINESS_HOURS en sábado', () => {
      expectOutsideHours(() => service.validateSlot('2026-10-03T10:00:00-04:00', fixedNow));
    });

    it('validateSlot lanza 422 OUTSIDE_BUSINESS_HOURS en domingo', () => {
      expectOutsideHours(() => service.validateSlot('2026-10-04T10:00:00-04:00', fixedNow));
    });
  });

  describe('Criterio 3: 08:30, 18:00 o 09:15 son inválidos (y comprobación de 422 con código)', () => {
    // 2026-09-29 es martes (día hábil)
    const fixedNow = DateTime.fromISO('2026-09-25T08:00:00-04:00', { setZone: true });

    const invalidTimes = [
      { time: '2026-09-29T08:30:00-04:00', reason: '08:30 (antes de horario 09:00)' },
      { time: '2026-09-29T18:00:00-04:00', reason: '18:00 (después del último turno 17:30)' },
      { time: '2026-09-29T09:15:00-04:00', reason: '09:15 (minutos no son :00 ni :30)' },
      { time: '2026-09-29T09:45:00-04:00', reason: '09:45 (minutos no son :00 ni :30)' },
      { time: '2026-09-29T09:30:15-04:00', reason: '09:30:15 (segundos distintos de cero)' },
    ];

    it.each(invalidTimes)(
      'rechaza con 422 OUTSIDE_BUSINESS_HOURS el horario $reason',
      ({ time }) => {
        expectOutsideHours(() => service.validateSlot(time, fixedNow));
      },
    );

    it('09:00 y 17:30 son horarios válidos', () => {
      expect(() => {
        service.validateSlot('2026-09-29T09:00:00-04:00', fixedNow);
      }).not.toThrow();

      expect(() => {
        service.validateSlot('2026-09-29T17:30:00-04:00', fixedNow);
      }).not.toThrow();
    });
  });

  describe('Criterio 4: Una fecha pasada es inválida', () => {
    // 2026-09-28 12:00:00
    const fixedNow = DateTime.fromISO('2026-09-28T12:00:00-04:00', { setZone: true });

    it('validateSlot rechaza horarios de un día anterior con 422 OUTSIDE_BUSINESS_HOURS', () => {
      expectOutsideHours(() => service.validateSlot('2026-09-25T10:00:00-04:00', fixedNow));
    });

    it('validateSlot rechaza un horario pasado del mismo día con 422 OUTSIDE_BUSINESS_HOURS', () => {
      // Son las 12:00, las 11:30 ya pasó
      expectOutsideHours(() => service.validateSlot('2026-09-28T11:30:00-04:00', fixedNow));
    });

    it('validateSlot acepta un horario futuro del mismo día', () => {
      expect(() => {
        service.validateSlot('2026-09-28T14:30:00-04:00', fixedNow);
      }).not.toThrow();
    });

    it('generateSlots marca available: false para horarios pasados y true para futuros', () => {
      const slots = service.generateSlots('2026-09-28', 'PEDIATRIA', fixedNow);

      // A las 12:00: los slots de 09:00 a 11:30 (6 slots) ya pasaron
      const pastSlots = slots.filter((s) => s.startTime < '2026-09-28T12:00:00-04:00');
      const futureSlots = slots.filter((s) => s.startTime >= '2026-09-28T12:00:00-04:00');

      expect(pastSlots).toHaveLength(6);
      expect(pastSlots.every((s) => s.available === false)).toBe(true);

      expect(futureSlots).toHaveLength(12);
      expect(futureSlots.every((s) => s.available === true)).toBe(true);
    });

    it('generateSlots para un día completamente pasado tiene todos los slots con available: false', () => {
      const yesterdaySlots = service.generateSlots('2026-09-25', 'CARDIOLOGIA', fixedNow);
      expect(yesterdaySlots).toHaveLength(18);
      expect(yesterdaySlots.every((s) => s.available === false)).toBe(true);
    });
  });

  describe('Criterio 5: Los horarios se calculan en la zona de CLINIC_TZ (America/La_Paz)', () => {
    it('convierte un horario enviado en UTC a America/La_Paz (-04:00)', () => {
      // 13:00:00Z en UTC equivale a 09:00:00-04:00 en La Paz (válido)
      const fixedNow = DateTime.fromISO('2026-09-25T08:00:00-04:00', { setZone: true });
      const validatedDt = service.validateSlot('2026-09-28T13:00:00Z', fixedNow);

      expect(validatedDt.zoneName).toBe('America/La_Paz');
      expect(validatedDt.hour).toBe(9);
      expect(validatedDt.minute).toBe(0);
      expect(validatedDt.toISO({ suppressMilliseconds: true, includeOffset: true })).toBe(
        '2026-09-28T09:00:00-04:00',
      );
    });

    it('rechaza un horario en UTC que al convertirse a La Paz queda fuera del horario hábil', () => {
      // 09:00:00Z en UTC equivale a 05:00:00-04:00 en La Paz (fuera de horario)
      const fixedNow = DateTime.fromISO('2026-09-25T08:00:00-04:00', { setZone: true });
      expectOutsideHours(() => service.validateSlot('2026-09-28T09:00:00Z', fixedNow));
    });
  });

  describe('Cruce de medianoche UTC y zona horaria', () => {
    it('con now nocturno local (ya día siguiente en UTC), calcula correctamente disponibilidad de hoy y mañana', () => {
      // 2026-09-28T20:30:00-04:00 (en UTC ya es 2026-09-29T00:30:00Z)
      const nightNow = DateTime.fromISO('2026-09-28T20:30:00-04:00', { setZone: true });

      // Para el 29 de septiembre (mañana en La Paz), los 18 slots están disponibles
      const tomorrowSlots = service.generateSlots('2026-09-29', 'MEDICINA_GENERAL', nightNow);
      expect(tomorrowSlots).toHaveLength(18);
      expect(tomorrowSlots.every((s) => s.available === true)).toBe(true);

      // Para el 28 de septiembre (hoy en La Paz, pero ya pasó el horario hábil), ninguno está disponible
      const todaySlots = service.generateSlots('2026-09-28', 'MEDICINA_GENERAL', nightNow);
      expect(todaySlots).toHaveLength(18);
      expect(todaySlots.every((s) => s.available === false)).toBe(true);
    });

    it('valida correctamente slots enviados en UTC en la frontera de medianoche', () => {
      const fixedNow = DateTime.fromISO('2026-09-25T08:00:00-04:00', { setZone: true });

      // 2026-10-02T21:30:00Z en UTC es viernes 17:30 en La Paz (válido)
      expect(() => service.validateSlot('2026-10-02T21:30:00Z', fixedNow)).not.toThrow();

      // 2026-10-03T00:00:00Z en UTC es viernes 20:00 en La Paz (da 422 OUTSIDE_BUSINESS_HOURS)
      expectOutsideHours(() => service.validateSlot('2026-10-03T00:00:00Z', fixedNow));
    });
  });

  describe('Comportamiento en el límite exacto de now', () => {
    it('un slot que empieza exactamente en now se considera disponible y válido', () => {
      const exactSlotStart = '2026-09-28T09:00:00-04:00';
      const nowAtStart = DateTime.fromISO(exactSlotStart, { setZone: true });

      // En generateSlots: el slot de las 09:00 está disponible (available: true)
      const slots = service.generateSlots('2026-09-28', 'MEDICINA_GENERAL', nowAtStart);
      const slot0900 = slots.find((s) => s.startTime === exactSlotStart);
      expect(slot0900).toBeDefined();
      expect(slot0900?.available).toBe(true);

      // En validateSlot: no lanza excepción
      expect(() => service.validateSlot(exactSlotStart, nowAtStart)).not.toThrow();
    });

    it('un slot que empieza 1 segundo antes de now se considera pasado y da 422', () => {
      const slotStart = '2026-09-28T09:00:00-04:00';
      const nowOneSecondAfter = DateTime.fromISO('2026-09-28T09:00:01-04:00', { setZone: true });

      const slots = service.generateSlots('2026-09-28', 'MEDICINA_GENERAL', nowOneSecondAfter);
      const slot0900 = slots.find((s) => s.startTime === slotStart);
      expect(slot0900?.available).toBe(false);

      expectOutsideHours(() => service.validateSlot(slotStart, nowOneSecondAfter));
    });
  });

  describe('Validación de CLINIC_TZ en constructor', () => {
    const originalEnv = process.env.CLINIC_TZ;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.CLINIC_TZ = originalEnv;
      } else {
        delete process.env.CLINIC_TZ;
      }
    });

    it('lanza Error al inicializar si CLINIC_TZ es una zona inválida', () => {
      process.env.CLINIC_TZ = 'America/LaPaz'; // Sin guión bajo
      expect(() => new ScheduleService()).toThrow(
        'Zona horaria CLINIC_TZ inválida: "America/LaPaz"',
      );
    });

    it('acepta una zona IANA válida configurada por entorno', () => {
      process.env.CLINIC_TZ = 'America/Santiago';
      const customService = new ScheduleService();
      expect(customService.clinicTz).toBe('America/Santiago');
    });
  });

  describe('Helpers y validaciones adicionales', () => {
    it('calculateEndTime calcula 30 minutos después con offset', () => {
      const endTime = service.calculateEndTime('2026-09-28T09:00:00-04:00');
      expect(endTime).toBe('2026-09-28T09:30:00-04:00');
    });

    it('isBusinessDay devuelve true para lunes-viernes y false para sábado-domingo', () => {
      expect(service.isBusinessDay('2026-09-28')).toBe(true); // Lunes
      expect(service.isBusinessDay('2026-09-29')).toBe(true); // Martes
      expect(service.isBusinessDay('2026-10-02')).toBe(true); // Viernes
      expect(service.isBusinessDay('2026-10-03')).toBe(false); // Sábado
      expect(service.isBusinessDay('2026-10-04')).toBe(false); // Domingo
    });

    it('countBusinessDays cuenta días hábiles entre dos fechas inclusive', () => {
      // De lunes 2026-09-28 a viernes 2026-10-02 hay 5 días hábiles
      expect(service.countBusinessDays('2026-09-28', '2026-10-02')).toBe(5);
      // De viernes a lunes siguiente (2026-10-02 a 2026-10-05) hay 2 días hábiles
      expect(service.countBusinessDays('2026-10-02', '2026-10-05')).toBe(2);
    });

    it('lanza 400 VALIDATION_ERROR si el formato de fecha es inválido', () => {
      try {
        service.generateSlots('fecha-invalida');
        expect.unreachable('Debería haber lanzado ApiException');
      } catch (e) {
        expect(e).toBeInstanceOf(ApiException);
        const apiError = e as ApiException;
        expect(apiError.getStatus()).toBe(400);
        expect(apiError.getResponse()).toMatchObject({
          code: 'VALIDATION_ERROR',
          statusCode: 400,
        });
      }
    });

    it('lanza 400 VALIDATION_ERROR si la especialidad no existe', () => {
      try {
        service.generateSlots('2026-09-28', 'NEUROLOGIA' as any);
        expect.unreachable('Debería haber lanzado ApiException');
      } catch (e) {
        expect(e).toBeInstanceOf(ApiException);
        const apiError = e as ApiException;
        expect(apiError.getStatus()).toBe(400);
        expect(apiError.getResponse()).toMatchObject({
          code: 'VALIDATION_ERROR',
          statusCode: 400,
        });
      }
    });
  });
});
