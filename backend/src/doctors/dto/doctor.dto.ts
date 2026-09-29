import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';
import type { Specialty } from '../../common/constants/specialties.js';
import { SPECIALTIES } from '../../common/constants/specialties.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const NAME_LENGTH = 'El nombre debe tener entre 2 y 100 caracteres';

export class CreateDoctorDto {
  @Transform(trim)
  @IsString({ message: 'El nombre es requerido' })
  @Length(2, 100, { message: NAME_LENGTH })
  name!: string;

  @IsIn(SPECIALTIES, { message: `Especialidad inválida. Debe ser una de: ${SPECIALTIES.join(', ')}` })
  specialty!: Specialty;
}

/** La especialidad no se cambia: para eso se desactiva al médico y se registra otro. */
export class UpdateDoctorDto {
  @IsOptional()
  @Transform(trim)
  @IsString({ message: 'El nombre es requerido' })
  @Length(2, 100, { message: NAME_LENGTH })
  name?: string;

  @IsOptional()
  @IsBoolean({ message: 'active debe ser true o false' })
  active?: boolean;
}
