import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReportQueryDto } from './report-query.dto.js';

async function failingFields(input: Record<string, unknown>) {
  const errors = await validate(plainToInstance(ReportQueryDto, input));
  return errors.map((e) => e.property);
}

describe('ReportQueryDto', () => {
  it('acepta objeto vacío (todos los parámetros son opcionales)', async () => {
    expect(await failingFields({})).toEqual([]);
  });

  it('acepta parámetros válidos completos', async () => {
    expect(
      await failingFields({
        from: '2026-09-28',
        to: '2026-10-02',
        specialty: 'PEDIATRIA',
        status: 'ACTIVE',
        format: 'xlsx',
      }),
    ).toEqual([]);

    expect(
      await failingFields({
        status: 'ALL',
        format: 'csv',
      }),
    ).toEqual([]);
  });

  it.each([
    ['formato inválido en from', { from: '28-09-2026' }, 'from'],
    ['fecha imposible en from', { from: '2026-02-31' }, 'from'],
    ['formato inválido en to', { to: '2026/10/02' }, 'to'],
    ['fecha imposible en to', { to: '2026-11-31' }, 'to'],
    ['especialidad inexistente', { specialty: 'ONCOLOGIA' }, 'specialty'],
    ['especialidad vacía', { specialty: '' }, 'specialty'],
    ['estado inexistente', { status: 'PENDING' }, 'status'],
    ['formato no soportado (ej. pdf)', { format: 'pdf' }, 'format'],
  ])('rechaza %s', async (_caso, change, field) => {
    expect(await failingFields(change)).toEqual([field]);
  });
});
