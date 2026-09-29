import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateDoctorDto, UpdateDoctorDto } from './doctor.dto.js';

async function failing<T extends object>(cls: new () => T, input: Record<string, unknown>) {
  return (await validate(plainToInstance(cls, input))).map((e) => e.property);
}

describe('CreateDoctorDto', () => {
  it('acepta un body válido y recorta espacios del nombre', async () => {
    const dto = plainToInstance(CreateDoctorDto, { name: '  Dra. Laura Méndez ', specialty: 'DERMATOLOGIA' });
    expect(dto.name).toBe('Dra. Laura Méndez');
    expect(await validate(dto)).toEqual([]);
  });

  it.each([
    ['nombre de 1 carácter tras recortar', { name: '  A ' }, 'name'],
    ['nombre de 101 caracteres', { name: 'a'.repeat(101) }, 'name'],
    ['especialidad desconocida', { specialty: 'ODONTOLOGIA' }, 'specialty'],
  ])('rechaza %s', async (_caso, change, field) => {
    expect(await failing(CreateDoctorDto, { name: 'Dra. Laura Méndez', specialty: 'PEDIATRIA', ...change })).toEqual([field]);
  });

  it('rechaza cada campo faltante', async () => {
    expect(await failing(CreateDoctorDto, {})).toEqual(['name', 'specialty']);
  });
});

describe('UpdateDoctorDto', () => {
  it('acepta nombre, estado, ambos o ninguno', async () => {
    expect(await failing(UpdateDoctorDto, {})).toEqual([]);
    expect(await failing(UpdateDoctorDto, { name: 'Dra. Sofía Arce', active: false })).toEqual([]);
  });

  it.each([
    ['active como texto', { active: 'false' }, 'active'],
    ['nombre muy corto', { name: 'A' }, 'name'],
  ])('rechaza %s', async (_caso, input, field) => {
    expect(await failing(UpdateDoctorDto, input)).toEqual([field]);
  });
});
