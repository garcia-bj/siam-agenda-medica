import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { QueryAppointmentsDto } from './query-appointments.dto.js';
import { UpdateAppointmentDto } from './update-appointment.dto.js';

async function failing<T extends object>(cls: new () => T, input: Record<string, unknown>) {
  return (await validate(plainToInstance(cls, input))).map((e) => e.property);
}

describe('QueryAppointmentsDto', () => {
  it('acepta sin filtros y con todos los filtros válidos', async () => {
    expect(await failing(QueryAppointmentsDto, {})).toEqual([]);
    expect(await failing(QueryAppointmentsDto, { specialty: 'PEDIATRIA', date: '2030-06-17', status: 'ALL' })).toEqual([]);
  });

  it.each([
    ['especialidad desconocida', { specialty: 'ODONTOLOGIA' }, 'specialty'],
    ['especialidad vacía', { specialty: '' }, 'specialty'],
    ['fecha con otro formato', { date: '17/06/2030' }, 'date'],
    ['fecha imposible', { date: '2030-02-31' }, 'date'],
    ['estado desconocido', { status: 'PENDING' }, 'status'],
  ])('rechaza %s', async (_caso, input, field) => {
    expect(await failing(QueryAppointmentsDto, input)).toEqual([field]);
  });
});

describe('UpdateAppointmentDto', () => {
  it('acepta un startTime con zona horaria', async () => {
    expect(await failing(UpdateAppointmentDto, { startTime: '2030-06-18T11:30:00-04:00' })).toEqual([]);
  });

  it.each([
    ['sin startTime', {}],
    ['sin zona horaria', { startTime: '2030-06-18T11:30:00' }],
  ])('rechaza %s', async (_caso, input) => {
    expect(await failing(UpdateAppointmentDto, input)).toEqual(['startTime']);
  });
});
