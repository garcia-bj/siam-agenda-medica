import { Injectable } from '@nestjs/common';
import { DateTime, IANAZone } from 'luxon';
import { ApiException } from '../common/api-exception.js';
import { SPECIALTIES, Specialty } from '../common/constants/specialties.js';

export interface Slot {
  specialty: Specialty;
  startTime: string;
  endTime: string;
  available: boolean;
}

export const DEFAULT_CLINIC_TZ = 'America/La_Paz';
export const BUSINESS_START_HOUR = 9;
export const BUSINESS_START_MINUTE = 0;
export const SLOT_DURATION_MINUTES = 30;
export const LAST_SLOT_HOUR = 17;
export const LAST_SLOT_MINUTE = 30;

@Injectable()
export class ScheduleService {
  readonly clinicTz: string;

  constructor() {
    this.clinicTz = process.env.CLINIC_TZ || DEFAULT_CLINIC_TZ;
    if (!IANAZone.isValidZone(this.clinicTz)) {
      throw new Error(
        `Zona horaria CLINIC_TZ inválida: "${this.clinicTz}". Debe ser una zona IANA válida (ej: America/La_Paz).`,
      );
    }
  }

  /**
   * Genera los slots para una fecha y opcionalmente una especialidad,
   * sin acceso a la base de datos.
   *
   * En días hábiles (lunes a viernes): 18 slots por especialidad (09:00 a 17:30).
   * En fines de semana (sábado o domingo): retorna un arreglo vacío [].
   * Un slot que empieza en el pasado se marca con available: false.
   */
  generateSlots(
    date: string,
    specialty?: Specialty,
    now?: DateTime | Date | string,
  ): Slot[] {
    const day = this.parseDate(date);
    if (!day.isValid) {
      throw new ApiException(400, 'VALIDATION_ERROR', 'Fecha inválida. Debe tener formato YYYY-MM-DD');
    }

    if (specialty && !SPECIALTIES.includes(specialty)) {
      throw new ApiException(400, 'VALIDATION_ERROR', `Especialidad inválida: ${specialty}`);
    }

    // Sábado (6) o domingo (7): no se generan slots
    if (day.weekday === 6 || day.weekday === 7) {
      return [];
    }

    const currentNow = this.resolveNow(now);
    const specialtiesToGenerate: Specialty[] = specialty ? [specialty] : [...SPECIALTIES];
    const slots: Slot[] = [];

    // Generar 18 bloques de 30 minutos: desde 09:00 hasta 17:30 inclusive
    let currentSlotStart = day.set({
      hour: BUSINESS_START_HOUR,
      minute: BUSINESS_START_MINUTE,
      second: 0,
      millisecond: 0,
    });

    const lastSlotStart = day.set({
      hour: LAST_SLOT_HOUR,
      minute: LAST_SLOT_MINUTE,
      second: 0,
      millisecond: 0,
    });

    while (currentSlotStart <= lastSlotStart) {
      const slotEnd = currentSlotStart.plus({ minutes: SLOT_DURATION_MINUTES });
      const startTimeIso = currentSlotStart.toISO({ suppressMilliseconds: true, includeOffset: true })!;
      const endTimeIso = slotEnd.toISO({ suppressMilliseconds: true, includeOffset: true })!;
      const isPast = currentSlotStart < currentNow;

      for (const spec of specialtiesToGenerate) {
        slots.push({
          specialty: spec,
          startTime: startTimeIso,
          endTime: endTimeIso,
          available: !isPast,
        });
      }

      currentSlotStart = currentSlotStart.plus({ minutes: SLOT_DURATION_MINUTES });
    }

    return slots;
  }

  /**
   * Valida que un horario de inicio esté dentro de las reglas de atención.
   * Lanza ApiException con código 422 OUTSIDE_BUSINESS_HOURS si es inválido:
   * - Fin de semana (sábado o domingo)
   * - Fuera de 09:00 a 18:00 (último turno a las 17:30)
   * - Minutos distintos de :00 o :30, o con segundos/milisegundos
   * - Fecha u hora pasada
   */
  validateSlot(startTime: string | Date, now?: DateTime | Date | string): DateTime {
    const slotDt = this.toDateTime(startTime);
    if (!slotDt.isValid) {
      throw new ApiException(400, 'VALIDATION_ERROR', 'Fecha y hora de inicio inválida');
    }

    const currentNow = this.resolveNow(now);

    // No se permiten fechas u horas pasadas
    if (slotDt < currentNow) {
      throw new ApiException(
        422,
        'OUTSIDE_BUSINESS_HOURS',
        'No se pueden agendar citas en fechas u horas pasadas',
      );
    }

    // Sábado (6) o domingo (7)
    if (slotDt.weekday === 6 || slotDt.weekday === 7) {
      throw new ApiException(
        422,
        'OUTSIDE_BUSINESS_HOURS',
        'Las citas solo pueden agendarse de lunes a viernes',
      );
    }

    // Bloques de 30 minutos (:00 o :30, sin segundos ni milisegundos)
    if (
      (slotDt.minute !== 0 && slotDt.minute !== 30) ||
      slotDt.second !== 0 ||
      Math.floor(slotDt.millisecond) !== 0
    ) {
      throw new ApiException(
        422,
        'OUTSIDE_BUSINESS_HOURS',
        'Los turnos deben ser en bloques de 30 minutos (:00 o :30)',
      );
    }

    // Rango horario: 09:00 a 18:00 (último inicio permitido: 17:30)
    const minutesFromMidnight = slotDt.hour * 60 + slotDt.minute;
    const minMinutes = BUSINESS_START_HOUR * 60 + BUSINESS_START_MINUTE; // 540
    const maxMinutes = LAST_SLOT_HOUR * 60 + LAST_SLOT_MINUTE; // 1050

    if (minutesFromMidnight < minMinutes || minutesFromMidnight > maxMinutes) {
      throw new ApiException(
        422,
        'OUTSIDE_BUSINESS_HOURS',
        'El horario de atención es de 09:00 a 18:00 (último turno a las 17:30)',
      );
    }

    return slotDt;
  }

  /**
   * Calcula el endTime (startTime + 30 minutos) en formato ISO con offset.
   */
  calculateEndTime(startTime: string | Date | DateTime): string {
    const dt = this.toDateTime(startTime);
    if (!dt.isValid) {
      throw new ApiException(400, 'VALIDATION_ERROR', 'Fecha y hora de inicio inválida');
    }
    return dt.plus({ minutes: SLOT_DURATION_MINUTES }).toISO({
      suppressMilliseconds: true,
      includeOffset: true,
    })!;
  }

  /**
   * Determina si una fecha corresponde a un día hábil (lunes a viernes).
   */
  isBusinessDay(date: string | Date | DateTime): boolean {
    const dt = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
      ? this.parseDate(date)
      : this.toDateTime(date);

    return dt.isValid && dt.weekday >= 1 && dt.weekday <= 5;
  }

  /**
   * Cuenta los días hábiles (lunes a viernes) entre dos fechas inclusive.
   */
  countBusinessDays(from: string, to: string): number {
    const start = this.parseDate(from);
    const end = this.parseDate(to);

    if (!start.isValid || !end.isValid || start > end) {
      throw new ApiException(400, 'VALIDATION_ERROR', 'Rango de fechas inválido');
    }

    let count = 0;
    let current = start;

    while (current <= end) {
      if (current.weekday >= 1 && current.weekday <= 5) {
        count++;
      }
      current = current.plus({ days: 1 });
    }

    return count;
  }

  private parseDate(date: string): DateTime {
    return DateTime.fromFormat(date, 'yyyy-MM-dd', { zone: this.clinicTz });
  }

  private toDateTime(value: string | Date | DateTime): DateTime {
    if (value instanceof DateTime) {
      return value.setZone(this.clinicTz);
    }
    if (value instanceof Date) {
      return DateTime.fromJSDate(value, { zone: this.clinicTz });
    }
    return DateTime.fromISO(value, { zone: this.clinicTz });
  }

  private resolveNow(now?: DateTime | Date | string): DateTime {
    if (!now) {
      return DateTime.now().setZone(this.clinicTz);
    }
    return this.toDateTime(now);
  }
}
