import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { ApiException } from '../common/api-exception.js';
import { SPECIALTY_LABELS, Specialty } from '../common/constants/specialties.js';
import { PrismaService } from '../database/prisma.service.js';
import { DoctorsService } from '../doctors/doctors.service.js';
import { Prisma, type Appointment } from '../generated/prisma/client.js';
import { ScheduleService } from '../schedule/schedule.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { QueryAppointmentsDto } from './dto/query-appointments.dto.js';
import { UpdateAppointmentDto } from './dto/update-appointment.dto.js';

/** Cita tal como la devuelve la API: fechas en ISO 8601 con el desfase de CLINIC_TZ (docs/api.md). */
export interface AppointmentResponse {
  id: string;
  patientName: string;
  patientEmail: string;
  specialty: Specialty;
  doctorName: string | null;
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
    private readonly doctorsService: DoctorsService,
  ) {}

  /**
   * Reserva una cita. El antioverbooking lo garantiza el índice único parcial de la base:
   * se inserta directo y un P2002 se traduce a 409. Nada de "consultar y luego insertar",
   * porque entre los dos pasos otra petición puede tomar el slot.
   * Valida que la especialidad tenga un médico activo (422 NO_DOCTOR).
   */
  async create(dto: CreateAppointmentDto, now?: DateTime | Date | string): Promise<AppointmentResponse> {
    const start = this.scheduleService.validateSlot(dto.startTime, now);

    const activeDoctors = await this.doctorsService.findActiveBySpecialty(dto.specialty as Specialty);
    const doctor = activeDoctors.get(dto.specialty as Specialty);
    if (!doctor) {
      throw new ApiException(
        422,
        'NO_DOCTOR',
        `La especialidad ${SPECIALTY_LABELS[dto.specialty as Specialty]} no tiene un médico activo`,
      );
    }

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
      return this.toResponse(created, doctor.name);
    } catch (error) {
      throw this.translateSlotTaken(error, dto.specialty as Specialty);
    }
  }

  /**
   * Lista por hora. Sin `status` devuelve solo las activas; `date` es el día en CLINIC_TZ.
   * Agrega doctorName del médico activo actual de la especialidad en una sola consulta (sin N+1).
   */
  async findAll(query: QueryAppointmentsDto): Promise<{ data: AppointmentResponse[] }> {
    const { specialty, date, status = 'ACTIVE' } = query;
    let startTime: { gte: Date; lte: Date } | undefined;
    if (date) {
      const day = DateTime.fromFormat(date, 'yyyy-MM-dd', { zone: this.scheduleService.clinicTz });
      startTime = { gte: day.startOf('day').toJSDate(), lte: day.endOf('day').toJSDate() };
    }

    const [rows, activeDoctors] = await Promise.all([
      this.prisma.appointment.findMany({
        where: {
          ...(status !== 'ALL' ? { status } : {}),
          ...(specialty ? { specialty } : {}),
          ...(startTime ? { startTime } : {}),
        },
        orderBy: { startTime: 'asc' },
      }),
      this.doctorsService.findActiveBySpecialty(specialty ? (specialty as Specialty) : undefined),
    ]);

    return {
      data: rows.map((row) =>
        this.toResponse(row, activeDoctors.get(row.specialty as Specialty)?.name ?? null),
      ),
    };
  }

  /**
   * Mueve una cita activa a otro horario de la misma especialidad.
   * Valida que la especialidad tenga un médico activo (422 NO_DOCTOR).
   */
  async reschedule(id: string, dto: UpdateAppointmentDto, now?: DateTime | Date | string): Promise<AppointmentResponse> {
    const current = await this.findActive(id);
    const start = this.scheduleService.validateSlot(dto.startTime, now);

    const activeDoctors = await this.doctorsService.findActiveBySpecialty(current.specialty as Specialty);
    const doctor = activeDoctors.get(current.specialty as Specialty);
    if (!doctor) {
      throw new ApiException(
        422,
        'NO_DOCTOR',
        `La especialidad ${SPECIALTY_LABELS[current.specialty as Specialty]} no tiene un médico activo`,
      );
    }

    if (start.toMillis() === current.startTime.getTime()) return this.toResponse(current, doctor.name);

    try {
      // `status: 'ACTIVE'` en el where: si otra petición la canceló en el medio, Prisma lanza P2025.
      const updated = await this.prisma.appointment.update({
        where: { id, status: 'ACTIVE' },
        data: { startTime: start.toJSDate(), endTime: new Date(this.scheduleService.calculateEndTime(start)) },
      });
      return this.toResponse(updated, doctor.name);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') throw alreadyCancelled();
      throw this.translateSlotTaken(error, current.specialty as Specialty);
    }
  }

  /** Cancelación suave, atómica: solo cambia la fila si sigue ACTIVE. */
  async cancel(id: string): Promise<void> {
    const { count } = await this.prisma.appointment.updateMany({
      where: { id, status: 'ACTIVE' },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    if (count === 0) await this.findActive(id); // lanza 404 o 409 según corresponda
  }

  /** La cita existe y está activa; si no, 404 NOT_FOUND o 409 ALREADY_CANCELLED. */
  private async findActive(id: string): Promise<Appointment> {
    const appointment = await this.prisma.appointment.findUnique({ where: { id } });
    if (!appointment) throw new ApiException(404, 'NOT_FOUND', 'La cita no existe');
    if (appointment.status === 'CANCELLED') throw alreadyCancelled();
    return appointment;
  }

  /** Un P2002 del índice único parcial significa que el slot ya tiene una cita activa. */
  private translateSlotTaken(error: unknown, specialty: Specialty): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new ApiException(409, 'SLOT_TAKEN', `El horario ya está ocupado para ${SPECIALTY_LABELS[specialty]}`);
    }
    return error;
  }

  toResponse(appointment: Appointment, doctorName: string | null = null): AppointmentResponse {
    const iso = (date: Date) =>
      DateTime.fromJSDate(date).setZone(this.scheduleService.clinicTz).toISO({ suppressMilliseconds: true })!;
    return {
      id: appointment.id,
      patientName: appointment.patientName,
      patientEmail: appointment.patientEmail,
      specialty: appointment.specialty as Specialty,
      doctorName,
      startTime: iso(appointment.startTime),
      endTime: iso(appointment.endTime),
      status: appointment.status as AppointmentResponse['status'],
      cancelledAt: appointment.cancelledAt ? iso(appointment.cancelledAt) : null,
      createdAt: iso(appointment.createdAt),
    };
  }
}

const alreadyCancelled = () => new ApiException(409, 'ALREADY_CANCELLED', 'La cita ya está cancelada');
