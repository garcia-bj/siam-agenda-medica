import { IsIn, IsISO8601, IsOptional, Matches } from 'class-validator';
import type { Specialty } from '../../common/constants/specialties.js';
import { SPECIALTIES } from '../../common/constants/specialties.js';

export const STATUS_FILTERS = ['ACTIVE', 'CANCELLED', 'ALL'] as const;
export type StatusFilter = (typeof STATUS_FILTERS)[number];

export class QueryAppointmentsDto {
  @IsOptional()
  @IsIn(SPECIALTIES, { message: `Especialidad inválida. Debe ser una de: ${SPECIALTIES.join(', ')}` })
  specialty?: Specialty;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'La fecha no es válida' })
  date?: string;

  @IsOptional()
  @IsIn(STATUS_FILTERS, { message: `Estado inválido. Debe ser uno de: ${STATUS_FILTERS.join(', ')}` })
  status?: StatusFilter;
}
