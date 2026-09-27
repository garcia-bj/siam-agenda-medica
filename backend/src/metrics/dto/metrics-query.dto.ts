import { IsIn, IsISO8601, IsOptional, Matches } from 'class-validator';
import type { Specialty } from '../../common/constants/specialties.js';
import { SPECIALTIES } from '../../common/constants/specialties.js';

export class MetricsQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha from debe tener formato YYYY-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'La fecha from no es válida' })
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha to debe tener formato YYYY-MM-DD' })
  @IsISO8601({ strict: true }, { message: 'La fecha to no es válida' })
  to?: string;

  @IsOptional()
  @IsIn(SPECIALTIES, { message: `Especialidad inválida. Debe ser una de: ${SPECIALTIES.join(', ')}` })
  specialty?: Specialty;
}
