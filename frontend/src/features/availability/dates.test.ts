import { describe, expect, it } from 'vitest';
import {
  addDays,
  businessDaysFrom,
  firstBookableDay,
  formatDayLong,
  isSelectable,
  monthGrid,
  monthLabel,
  nextSelectableDay,
  slotTime,
  todayInClinic,
} from './dates';

describe('todayInClinic', () => {
  it('usa el día de La Paz aunque en UTC ya sea mañana', () => {
    // 28 sep 2026 a las 23:30 en La Paz = 29 sep 03:30 UTC
    expect(todayInClinic(new Date('2026-09-29T03:30:00Z'))).toBe('2026-09-28');
  });
});

describe('firstBookableDay', () => {
  it('es hoy si todavía quedan franjas (hasta las 17:30 de La Paz)', () => {
    expect(firstBookableDay(new Date('2026-09-25T21:30:00Z'))).toBe('2026-09-25'); // viernes 17:30
  });

  it('pasa al siguiente día hábil cuando ya pasó la última franja', () => {
    expect(firstBookableDay(new Date('2026-09-25T21:31:00Z'))).toBe('2026-09-28'); // viernes 17:31 → lunes
    expect(firstBookableDay(new Date('2026-09-24T23:00:00Z'))).toBe('2026-09-25'); // jueves 19:00 → viernes
  });

  it('en fin de semana es el lunes', () => {
    expect(firstBookableDay(new Date('2026-09-26T14:00:00Z'))).toBe('2026-09-28'); // sábado 10:00
  });
});

describe('isSelectable', () => {
  const today = '2026-09-28'; // lunes

  it('permite hoy y días hábiles futuros', () => {
    expect(isSelectable('2026-09-28', today)).toBe(true);
    expect(isSelectable('2026-10-02', today)).toBe(true);
  });

  it('bloquea fines de semana y días pasados', () => {
    expect(isSelectable('2026-10-03', today)).toBe(false); // sábado
    expect(isSelectable('2026-10-04', today)).toBe(false); // domingo
    expect(isSelectable('2026-09-25', today)).toBe(false); // viernes pasado
  });
});

describe('días hábiles', () => {
  it('nextSelectableDay salta del sábado al lunes', () => {
    expect(nextSelectableDay('2026-10-03')).toBe('2026-10-05');
    expect(nextSelectableDay('2026-10-01')).toBe('2026-10-01');
  });

  it('businessDaysFrom devuelve 5 días hábiles seguidos, saltando el fin de semana', () => {
    expect(businessDaysFrom('2026-10-01', 5)).toEqual(['2026-10-01', '2026-10-02', '2026-10-05', '2026-10-06', '2026-10-07']);
  });

  it('addDays cruza fin de mes y de año', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('monthGrid', () => {
  it('empieza en lunes, termina en domingo y cubre el mes completo', () => {
    const cells = monthGrid(2026, 8); // septiembre 2026: empieza en martes
    expect(cells[0]).toBe('2026-08-31');
    expect(cells.at(-1)).toBe('2026-10-04');
    expect(cells.length % 7).toBe(0);
    expect(cells).toContain('2026-09-30');
  });
});

describe('formatos', () => {
  it('formatea en español', () => {
    expect(formatDayLong('2026-09-28')).toBe('Lunes 28 de septiembre');
    expect(monthLabel(2026, 8)).toBe('Septiembre 2026');
  });

  it('slotTime toma la hora local del ISO de la API', () => {
    expect(slotTime('2026-09-28T17:30:00-04:00')).toBe('17:30');
  });
});
