import { buildAppointments } from './seed-data.js';

const LA_PAZ_MS = -4 * 60 * 60 * 1000;
const local = (d: Date) => new Date(d.getTime() + LA_PAZ_MS);
const wednesday = new Date('2026-09-23T15:00:00Z');

describe('buildAppointments', () => {
  const appointments = buildAppointments(wednesday);

  it('genera 45 citas: 3 por día hábil durante 3 semanas', () => {
    expect(appointments).toHaveLength(45);
  });

  it('empieza el lunes de la semana y termina el viernes de dos semanas después', () => {
    const days = appointments.map((a) => local(a.startTime).toISOString().slice(0, 10)).sort();

    expect(days[0]).toBe('2026-09-21');
    expect(days.at(-1)).toBe('2026-10-09');
  });

  it('usa la semana de La Paz aunque en UTC ya sea el día siguiente', () => {
    // Lunes 28 a las 02:00 UTC = domingo 27 a las 22:00 en La Paz → semana del 21.
    const days = buildAppointments(new Date('2026-09-28T02:00:00Z')).map((a) =>
      local(a.startTime).toISOString().slice(0, 10),
    );

    expect(days.sort()[0]).toBe('2026-09-21');
  });

  it('pone todas las citas en horario de atención: L-V, 09:00 a 17:30, en punto o y media', () => {
    for (const { startTime } of appointments) {
      const t = local(startTime);
      expect(t.getUTCDay()).toBeGreaterThanOrEqual(1);
      expect(t.getUTCDay()).toBeLessThanOrEqual(5);
      expect(t.getUTCHours() * 60 + t.getUTCMinutes()).toBeGreaterThanOrEqual(9 * 60);
      expect(t.getUTCHours() * 60 + t.getUTCMinutes()).toBeLessThanOrEqual(17 * 60 + 30);
      expect([0, 30]).toContain(t.getUTCMinutes());
    }
  });

  it('cada cita dura 30 minutos', () => {
    for (const a of appointments) expect(a.endTime.getTime() - a.startTime.getTime()).toBe(30 * 60 * 1000);
  });

  it('no repite especialidad y hora entre citas activas (respeta el índice antioverbooking)', () => {
    const keys = appointments.filter((a) => a.status === 'ACTIVE').map((a) => `${a.specialty}|${a.startTime.toISOString()}`);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('incluye citas canceladas con cancelledAt, y las activas sin él', () => {
    const cancelled = appointments.filter((a) => a.status === 'CANCELLED');

    expect(cancelled).toHaveLength(6);
    expect(cancelled.every((a) => a.cancelledAt === wednesday)).toBe(true);
    expect(appointments.filter((a) => a.status === 'ACTIVE').every((a) => a.cancelledAt === null)).toBe(true);
  });

  it('reparte las citas entre las 4 especialidades', () => {
    expect(new Set(appointments.map((a) => a.specialty)).size).toBe(4);
  });

  it('da el mismo resultado para la misma fecha', () => {
    expect(buildAppointments(wednesday)).toEqual(appointments);
  });
});
