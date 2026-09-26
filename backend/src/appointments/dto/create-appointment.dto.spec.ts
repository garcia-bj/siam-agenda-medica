import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateAppointmentDto } from './create-appointment.dto.js';

const valid = { patientName: 'Ana Pérez', patientEmail: 'ana@correo.com', specialty: 'PEDIATRIA', startTime: '2030-06-17T10:00:00-04:00' };

async function failingFields(input: Record<string, unknown>) {
  const errors = await validate(plainToInstance(CreateAppointmentDto, input));
  return errors.map((e) => e.property);
}

describe('CreateAppointmentDto', () => {
  it('acepta un body válido, con desfase o en UTC', async () => {
    expect(await failingFields(valid)).toEqual([]);
    expect(await failingFields({ ...valid, startTime: '2030-06-17T14:00:00Z' })).toEqual([]);
  });

  it('recorta espacios del nombre antes de validar el largo', async () => {
    const dto = plainToInstance(CreateAppointmentDto, { ...valid, patientName: '  Ana  ' });
    expect(dto.patientName).toBe('Ana');
    expect(await failingFields({ ...valid, patientName: '  A  ' })).toEqual(['patientName']);
  });

  it.each([
    ['nombre de 101 caracteres', { patientName: 'a'.repeat(101) }, 'patientName'],
    ['email inválido', { patientEmail: 'no-es-email' }, 'patientEmail'],
    ['especialidad desconocida', { specialty: 'ODONTOLOGIA' }, 'specialty'],
    ['fecha sin zona horaria', { startTime: '2030-06-17T10:00:00' }, 'startTime'],
    ['fecha imposible', { startTime: '2030-02-31T10:00:00-04:00' }, 'startTime'],
  ])('rechaza %s', async (_caso, change, field) => {
    expect(await failingFields({ ...valid, ...change })).toEqual([field]);
  });

  it('rechaza cada campo faltante', async () => {
    expect(await failingFields({})).toEqual(['patientName', 'patientEmail', 'specialty', 'startTime']);
  });
});
