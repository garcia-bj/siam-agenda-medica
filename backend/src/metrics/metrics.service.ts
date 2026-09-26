import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { ApiException } from '../common/api-exception.js';
import { SPECIALTIES, Specialty } from '../common/constants/specialties.js';
import { PrismaService } from '../database/prisma.service.js';
import { ScheduleService } from '../schedule/schedule.service.js';
import { MetricsQueryDto } from './dto/metrics-query.dto.js';

export interface MetricsSummary {
  range: {
    from: string;
    to: string;
    businessDays: number;
  };
  totals: {
    active: number;
    cancelled: number;
    capacity: number;
    occupancyRate: number;
    cancellationRate: number;
  };
  bySpecialty: {
    specialty: Specialty;
    active: number;
    cancelled: number;
    capacity: number;
    occupancyRate: number;
  }[];
  byDay: {
    date: string;
    active: number;
    cancelled: number;
  }[];
  byHour: {
    hour: string;
    active: number;
  }[];
}

const BUSINESS_HOURS = [
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
] as const;

@Injectable()
export class MetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleService: ScheduleService,
  ) {}

  /**
   * Obtiene el resumen de métricas para un rango de fechas y opcionalmente especialidad.
   * - Si from y to no vienen, se usa la semana actual (lunes a viernes en CLINIC_TZ).
   * - Valida que from <= to y que el rango no supere los 92 días.
   * - capacity = días hábiles * 18 * especialidades incluidas (4, o 1 si viene specialty).
   * - occupancyRate = active / capacity; cancellationRate = cancelled / (active + cancelled).
   * - Redondeo a 3 decimales; si el divisor es 0, la tasa es 0.
   */
  async getSummary(
    query: MetricsQueryDto,
    now?: DateTime | Date | string,
  ): Promise<MetricsSummary> {
    const tz = this.scheduleService.clinicTz;
    const currentNow = this.resolveNow(now, tz);

    // Valores por defecto: lunes a viernes de la semana actual
    const defaultFrom = currentNow.startOf('week').toFormat('yyyy-MM-dd');
    const defaultTo = currentNow.startOf('week').set({ weekday: 5 }).toFormat('yyyy-MM-dd');

    const from = query.from || defaultFrom;
    const to = query.to || defaultTo;

    const fromDt = DateTime.fromFormat(from, 'yyyy-MM-dd', { zone: tz });
    const toDt = DateTime.fromFormat(to, 'yyyy-MM-dd', { zone: tz });

    if (!fromDt.isValid || !toDt.isValid) {
      throw new ApiException(400, 'VALIDATION_ERROR', 'Fecha inválida. Debe tener formato YYYY-MM-DD');
    }

    if (fromDt > toDt) {
      throw new ApiException(400, 'VALIDATION_ERROR', 'La fecha from no puede ser posterior a to');
    }

    const diffDays = Math.round(toDt.diff(fromDt, 'days').days);
    if (diffDays > 92) {
      throw new ApiException(400, 'VALIDATION_ERROR', 'El rango de fechas no puede ser mayor a 92 días');
    }

    // Contar días hábiles en el rango
    const businessDays = this.scheduleService.countBusinessDays(from, to);

    // Especialidades incluidas (1 si se filtró por query, o las 4 del sistema)
    const specialtiesToInclude: Specialty[] = query.specialty
      ? [query.specialty]
      : [...SPECIALTIES];

    // Capacidad teórica total = días hábiles * 18 slots * especialidades incluidas
    const capacity = businessDays * 18 * specialtiesToInclude.length;

    // Rango de consulta en base de datos (inicio del día from y fin del día to en CLINIC_TZ)
    const startOfFrom = fromDt.startOf('day').toJSDate();
    const endOfTo = toDt.endOf('day').toJSDate();

    // Traer solo startTime, specialty y status del rango
    const appointments = await this.prisma.appointment.findMany({
      where: {
        startTime: { gte: startOfFrom, lte: endOfTo },
        ...(query.specialty ? { specialty: query.specialty } : {}),
      },
      select: {
        startTime: true,
        specialty: true,
        status: true,
      },
    });

    const activeAppointments = appointments.filter((a) => a.status === 'ACTIVE');
    const cancelledAppointments = appointments.filter((a) => a.status === 'CANCELLED');

    const active = activeAppointments.length;
    const cancelled = cancelledAppointments.length;

    const occupancyRate = capacity > 0 ? this.round3(active / capacity) : 0;
    const cancellationRate = active + cancelled > 0 ? this.round3(cancelled / (active + cancelled)) : 0;

    // Métricas por especialidad
    const bySpecialty = specialtiesToInclude.map((spec) => {
      const specCapacity = businessDays * 18;
      const specActive = activeAppointments.filter((a) => a.specialty === spec).length;
      const specCancelled = cancelledAppointments.filter((a) => a.specialty === spec).length;
      const specOccupancyRate = specCapacity > 0 ? this.round3(specActive / specCapacity) : 0;

      return {
        specialty: spec,
        active: specActive,
        cancelled: specCancelled,
        capacity: specCapacity,
        occupancyRate: specOccupancyRate,
      };
    });

    // Métricas por día hábil (una fila por cada día hábil del rango, aunque tenga ceros)
    const byDay: { date: string; active: number; cancelled: number }[] = [];
    let currentDay = fromDt;
    while (currentDay <= toDt) {
      if (currentDay.weekday >= 1 && currentDay.weekday <= 5) {
        byDay.push({
          date: currentDay.toFormat('yyyy-MM-dd'),
          active: 0,
          cancelled: 0,
        });
      }
      currentDay = currentDay.plus({ days: 1 });
    }

    const dayMap = new Map(byDay.map((d) => [d.date, d]));
    for (const appt of appointments) {
      const apptDateStr = DateTime.fromJSDate(appt.startTime).setZone(tz).toFormat('yyyy-MM-dd');
      const dayEntry = dayMap.get(apptDateStr);
      if (dayEntry) {
        if (appt.status === 'ACTIVE') {
          dayEntry.active++;
        } else if (appt.status === 'CANCELLED') {
          dayEntry.cancelled++;
        }
      }
    }

    // Métricas por hora (9 filas: 09:00 a 17:00; agrupa por hora de inicio; solo citas activas)
    const hourMap = new Map<string, number>();
    for (const h of BUSINESS_HOURS) {
      hourMap.set(h, 0);
    }

    for (const appt of activeAppointments) {
      const dtInTz = DateTime.fromJSDate(appt.startTime).setZone(tz);
      const hourStr = `${dtInTz.hour.toString().padStart(2, '0')}:00`;
      if (hourMap.has(hourStr)) {
        hourMap.set(hourStr, hourMap.get(hourStr)! + 1);
      }
    }

    const byHour = BUSINESS_HOURS.map((hour) => ({
      hour,
      active: hourMap.get(hour)!,
    }));

    return {
      range: {
        from,
        to,
        businessDays,
      },
      totals: {
        active,
        cancelled,
        capacity,
        occupancyRate,
        cancellationRate,
      },
      bySpecialty,
      byDay,
      byHour,
    };
  }

  private resolveNow(now: DateTime | Date | string | undefined, tz: string): DateTime {
    if (!now) {
      return DateTime.now().setZone(tz);
    }
    if (now instanceof DateTime) {
      return now.setZone(tz);
    }
    if (now instanceof Date) {
      return DateTime.fromJSDate(now, { zone: tz });
    }
    return DateTime.fromISO(now, { zone: tz });
  }

  private round3(val: number): number {
    return Math.round(val * 1000) / 1000;
  }
}
