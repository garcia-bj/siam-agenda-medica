import { IsIn, IsISO8601, IsOptional, Matches } from 'class-validator';
import type { Specialty } from '../../common/constants/specialties.js';
import { SPECIALTIES } from '../../common/constants/specialties.js';

export const REPORT_STATUSES = ['ACTIVE', 'CANCELLED', 'ALL'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_FORMATS = ['csv', 'xlsx'] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

export class ReportQueryDto {
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

  @IsOptional()
  @IsIn(REPORT_STATUSES, { message: `Estado inválido. Debe ser uno de: ${REPORT_STATUSES.join(', ')}` })
  status?: ReportStatus;

  @IsOptional()
  @IsIn(REPORT_FORMATS, { message: 'Formato no soportado. Debe ser csv o xlsx' })
  format?: ReportFormat;
}
