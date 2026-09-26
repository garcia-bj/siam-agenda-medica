import { IsIn, IsOptional, Matches } from 'class-validator';
import type { Specialty } from '../../common/constants/specialties.js';
import { SPECIALTIES } from '../../common/constants/specialties.js';

export class AppointmentsQueryDto {
  @IsOptional()
  @IsIn(SPECIALTIES, { message: `Especialidad inválida. Debe ser una de: ${SPECIALTIES.join(', ')}` })
  specialty?: Specialty;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  date?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'CANCELLED', 'ALL'])
  status?: 'ACTIVE' | 'CANCELLED' | 'ALL';
}
