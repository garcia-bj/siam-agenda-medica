import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { ApiException } from '../common/api-exception.js';
import { SPECIALTY_LABELS, Specialty } from '../common/constants/specialties.js';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma, type Appointment } from '../generated/prisma/client.js';
import { ScheduleService } from '../schedule/schedule.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';

/** Cita tal como la devuelve la API: fechas en ISO 8601 con el desfase de CLINIC_TZ (docs/api.md). */
export interface AppointmentResponse {
  id: string;
  patientName: string;
  patientEmail: string;
  specialty: Specialty;
  startTime: string;
  endTime: string;
  status: 'ACTIVE' | 'CANCELLED';
  cancelledAt: string | null;
  createdAt: string;
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleService: ScheduleService,
  ) {}

  /**
   * Reserva una cita. El antioverbooking lo garantiza el índice único parcial de la base:
   * se inserta directo y un P2002 se traduce a 409. Nada de "consultar y luego insertar",
   * porque entre los dos pasos otra petición puede tomar el slot.
   */
  async create(dto: CreateAppointmentDto, now?: DateTime | Date | string): Promise<AppointmentResponse> {
    const start = this.scheduleService.validateSlot(dto.startTime, now);

    try {
      const created = await this.prisma.appointment.create({
        data: {
          patientName: dto.patientName,
          patientEmail: dto.patientEmail,
          specialty: dto.specialty,
          startTime: start.toJSDate(),
          endTime: new Date(this.scheduleService.calculateEndTime(start)),
        },
      });
      return this.toResponse(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ApiException(409, 'SLOT_TAKEN', `El horario ya está ocupado para ${SPECIALTY_LABELS[dto.specialty]}`);
      }
      throw error;
    }
  }

  toResponse(appointment: Appointment): AppointmentResponse {
    const iso = (date: Date) =>
      DateTime.fromJSDate(date).setZone(this.scheduleService.clinicTz).toISO({ suppressMilliseconds: true })!;
    return {
      id: appointment.id,
      patientName: appointment.patientName,
      patientEmail: appointment.patientEmail,
      specialty: appointment.specialty as Specialty,
      startTime: iso(appointment.startTime),
      endTime: iso(appointment.endTime),
      status: appointment.status as AppointmentResponse['status'],
      cancelledAt: appointment.cancelledAt ? iso(appointment.cancelledAt) : null,
      createdAt: iso(appointment.createdAt),
    };
  }
}
