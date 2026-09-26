import { IsISO8601, Matches } from 'class-validator';

/** Reprogramar solo cambia la hora: la especialidad y los datos del paciente no se tocan. */
export class UpdateAppointmentDto {
  @IsISO8601({ strict: true }, { message: 'La fecha y hora de inicio no es válida' })
  @Matches(/(Z|[+-]\d{2}:\d{2})$/, { message: 'La fecha y hora de inicio debe incluir la zona horaria (ej. -04:00)' })
  startTime!: string;
}
