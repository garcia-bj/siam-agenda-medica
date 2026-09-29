import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { ApiException } from '../common/api-exception.js';
import { SPECIALTIES, SPECIALTY_LABELS, Specialty } from '../common/constants/specialties.js';
import { PrismaService } from '../database/prisma.service.js';
import { Prisma, type Doctor } from '../generated/prisma/client.js';
import { ScheduleService } from '../schedule/schedule.service.js';
import { CreateDoctorDto, UpdateDoctorDto } from './dto/doctor.dto.js';

/** Médico tal como lo devuelve la API (docs/api.md). */
export interface DoctorResponse {
  id: string;
  name: string;
  specialty: Specialty;
  active: boolean;
  /** Citas ACTIVE de su especialidad desde ahora; 0 si está inactivo. */
  upcomingAppointments: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class DoctorsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleService: ScheduleService,
  ) {}

  /** Todos los médicos, por especialidad y con el activo primero. Una sola consulta de citas para todos. */
  async findAll(now = new Date()): Promise<{ data: DoctorResponse[] }> {
    const [doctors, upcoming] = await Promise.all([
      this.prisma.doctor.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.appointment.groupBy({
        by: ['specialty'],
        where: { status: 'ACTIVE', startTime: { gte: now } },
        _count: { _all: true },
      }),
    ]);
    const bySpecialty = new Map(upcoming.map((g) => [g.specialty, g._count._all]));
    const order = (d: Doctor) => SPECIALTIES.indexOf(d.specialty as Specialty);

    const data = doctors
      .sort((a, b) => order(a) - order(b) || Number(b.active) - Number(a.active))
      .map((d) => this.toResponse(d, d.active ? (bySpecialty.get(d.specialty) ?? 0) : 0));
    return { data };
  }

  /** Registra un médico activo. El índice único parcial impide un segundo activo en la especialidad. */
  async create(dto: CreateDoctorDto): Promise<DoctorResponse> {
    try {
      const doctor = await this.prisma.doctor.create({ data: { name: dto.name, specialty: dto.specialty } });
      return this.toResponse(doctor, await this.countUpcoming(this.prisma, dto.specialty));
    } catch (error) {
      throw await this.translateSpecialtyTaken(error, dto.specialty);
    }
  }

  /**
   * Cambia el nombre y/o el estado.
   * - Desactivar con citas próximas → 409 DOCTOR_HAS_APPOINTMENTS. Se escribe primero y se cuenta después,
   *   dentro de la misma transacción: la escritura toma el lock de SQLite, así ninguna cita nueva se cuela
   *   entre el conteo y el cambio; si hay citas, el throw deshace la transacción.
   * - Reactivar con otro médico activo en la especialidad → 409 SPECIALTY_HAS_DOCTOR (índice parcial).
   */
  async update(id: string, dto: UpdateDoctorDto, now = new Date()): Promise<DoctorResponse> {
    const current = await this.prisma.doctor.findUnique({ where: { id } });
    if (!current) throw new ApiException(404, 'NOT_FOUND', 'El médico no existe');
    const specialty = current.specialty as Specialty;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const doctor = await tx.doctor.update({ where: { id }, data: { name: dto.name, active: dto.active } });
        const upcoming = doctor.active || current.active ? await this.countUpcoming(tx, specialty, now) : 0;

        if (current.active && !doctor.active && upcoming > 0) {
          const citas = upcoming === 1 ? '1 cita próxima' : `${upcoming} citas próximas`;
          throw new ApiException(
            409,
            'DOCTOR_HAS_APPOINTMENTS',
            `No se puede desactivar a ${current.name}: tiene ${citas} en ${SPECIALTY_LABELS[specialty]}. Cancélalas primero.`,
          );
        }
        return this.toResponse(doctor, doctor.active ? upcoming : 0);
      });
    } catch (error) {
      throw await this.translateSpecialtyTaken(error, specialty);
    }
  }

  private countUpcoming(db: Pick<PrismaService, 'appointment'>, specialty: Specialty, now = new Date()) {
    return db.appointment.count({ where: { specialty, status: 'ACTIVE', startTime: { gte: now } } });
  }

  /** Un P2002 del índice parcial significa que la especialidad ya tiene un médico activo. */
  private async translateSpecialtyTaken(error: unknown, specialty: Specialty): Promise<unknown> {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) return error;
    const holder = await this.prisma.doctor.findFirst({ where: { specialty, active: true } });
    const who = holder ? ` (${holder.name})` : '';
    return new ApiException(409, 'SPECIALTY_HAS_DOCTOR', `${SPECIALTY_LABELS[specialty]} ya tiene un médico activo${who}`);
  }

  private toResponse(doctor: Doctor, upcomingAppointments: number): DoctorResponse {
    const iso = (date: Date) =>
      DateTime.fromJSDate(date).setZone(this.scheduleService.clinicTz).toISO({ suppressMilliseconds: true })!;
    return {
      id: doctor.id,
      name: doctor.name,
      specialty: doctor.specialty as Specialty,
      active: doctor.active,
      upcomingAppointments,
      createdAt: iso(doctor.createdAt),
      updatedAt: iso(doctor.updatedAt),
    };
  }
}
