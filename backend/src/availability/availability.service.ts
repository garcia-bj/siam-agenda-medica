import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { ApiException } from '../common/api-exception.js';
import { Specialty } from '../common/constants/specialties.js';
import { PrismaService } from '../database/prisma.service.js';
import { DoctorsService } from '../doctors/doctors.service.js';
import { ScheduleService } from '../schedule/schedule.service.js';
import { AvailabilityQueryDto } from './dto/availability-query.dto.js';

export interface SlotDoctor {
  id: string;
  name: string;
}

export interface AvailabilitySlot {
  specialty: Specialty;
  doctor: SlotDoctor | null;
  startTime: string;
  endTime: string;
  available: boolean;
}

export interface AvailabilityResponse {
  date: string;
  isBusinessDay: boolean;
  slots: AvailabilitySlot[];
}

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleService: ScheduleService,
    private readonly doctorsService: DoctorsService,
  ) {}

  /**
   * Obtiene la disponibilidad de slots para una fecha y opcionalmente una especialidad.
   * - En días no laborables (sábado o domingo): retorna isBusinessDay: false y slots: [].
   * - Consulta las citas activas del día en una sola query a la base de datos.
   * - Consulta los médicos activos en una sola query (sin N+1) reutilizando DoctorsService.findActiveBySpecialty().
   * - Agrega doctor: { id, name } | null a cada slot por especialidad.
   * - Especialidad sin médico activo → sus slots salen con available: false.
   * - Cruza los slots generados con las citas ocupadas marcándolas con available: false.
   * - Los slots en el pasado ya vienen con available: false desde ScheduleService.
   */
  async getDay(
    query: AvailabilityQueryDto,
    now?: DateTime | Date | string,
  ): Promise<AvailabilityResponse> {
    const { date, specialty } = query;
    const tz = this.scheduleService.clinicTz;

    const dayInTz = DateTime.fromFormat(date, 'yyyy-MM-dd', { zone: tz });
    if (!dayInTz.isValid) {
      throw new ApiException(
        400,
        'VALIDATION_ERROR',
        'Fecha inválida. Debe tener formato YYYY-MM-DD',
      );
    }

    // Si es fin de semana, retornar de inmediato sin consultar la base de datos
    if (dayInTz.weekday === 6 || dayInTz.weekday === 7) {
      return { date, isBusinessDay: false, slots: [] };
    }

    // Generar la grilla de slots base para el día
    const slots = this.scheduleService.generateSlots(date, specialty, now);

    // Rango del día en la zona horaria de la clínica para consultar la base de datos
    const startOfDay = dayInTz.startOf('day').toJSDate();
    const endOfDay = dayInTz.endOf('day').toJSDate();

    // Consulta de citas ACTIVE del día y médicos activos por especialidad en una sola consulta por tipo (sin N+1)
    const [activeAppointments, activeDoctors] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          status: 'ACTIVE',
          startTime: { gte: startOfDay, lte: endOfDay },
          ...(specialty ? { specialty } : {}),
        },
        select: { specialty: true, startTime: true },
      }),
      this.doctorsService.findActiveBySpecialty(specialty ? [specialty] : undefined),
    ]);

    // Mapear citas activas a un Set de claves "ESPECIALIDAD|ISO_START_TIME" para cruce O(1)
    const occupiedKeys = new Set<string>();
    for (const appt of activeAppointments) {
      const isoStart = DateTime.fromJSDate(appt.startTime)
        .setZone(tz)
        .toISO({ suppressMilliseconds: true, includeOffset: true });

      if (isoStart) {
        occupiedKeys.add(`${appt.specialty}|${isoStart}`);
      }
    }

    // Cruzar slots generados con citas ocupadas y médico activo
    const resultSlots: AvailabilitySlot[] = slots.map((slot) => {
      const doctor = activeDoctors.get(slot.specialty) ?? null;
      const isOccupied = occupiedKeys.has(`${slot.specialty}|${slot.startTime}`);
      const hasDoctor = doctor !== null;

      return {
        specialty: slot.specialty,
        doctor,
        startTime: slot.startTime,
        endTime: slot.endTime,
        available: slot.available && !isOccupied && hasDoctor,
      };
    });

    return { date, isBusinessDay: true, slots: resultSlots };
  }
}
