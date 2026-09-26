import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsISO8601, IsString, Length, Matches } from 'class-validator';
import type { Specialty } from '../../common/constants/specialties.js';
import { SPECIALTIES } from '../../common/constants/specialties.js';

export class CreateAppointmentDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString({ message: 'El nombre es requerido' })
  @Length(2, 100, { message: 'El nombre debe tener entre 2 y 100 caracteres' })
  patientName!: string;

  @IsEmail({}, { message: 'Debe ser un email válido' })
  patientEmail!: string;

  @IsIn(SPECIALTIES, { message: `Especialidad inválida. Debe ser una de: ${SPECIALTIES.join(', ')}` })
  specialty!: Specialty;

  @IsISO8601({ strict: true }, { message: 'La fecha y hora de inicio no es válida' })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/, { message: 'La fecha y hora de inicio debe incluir la zona horaria (ej. -04:00)' })
  startTime!: string;
}
