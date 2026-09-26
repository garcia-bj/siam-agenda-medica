import { describe, expect, it } from 'vitest';
import { bookingSchema } from './schema';

const valid = {
  patientName: 'María López',
  patientEmail: 'maria@correo.com',
  specialty: 'PEDIATRIA' as const,
  startTime: '2026-10-01T09:00:00-04:00',
};

describe('bookingSchema', () => {
  it('acepta datos válidos', () => {
    expect(bookingSchema.safeParse(valid).success).toBe(true);
  });

  it('rechaza nombre vacío', () => {
    const result = bookingSchema.safeParse({ ...valid, patientName: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('al menos 2 caracteres');
    }
  });

  it('rechaza nombre de un solo carácter', () => {
    const result = bookingSchema.safeParse({ ...valid, patientName: 'A' });
    expect(result.success).toBe(false);
  });

  it('rechaza nombre mayor a 100 caracteres', () => {
    const result = bookingSchema.safeParse({ ...valid, patientName: 'A'.repeat(101) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('100 caracteres');
    }
  });

  it('acepta nombre de 2 caracteres (borde inferior)', () => {
    expect(bookingSchema.safeParse({ ...valid, patientName: 'AB' }).success).toBe(true);
  });

  it('acepta nombre de 100 caracteres (borde superior)', () => {
    expect(bookingSchema.safeParse({ ...valid, patientName: 'A'.repeat(100) }).success).toBe(true);
  });

  it('rechaza email vacío', () => {
    const result = bookingSchema.safeParse({ ...valid, patientEmail: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('obligatorio');
    }
  });

  it('rechaza email inválido', () => {
    const result = bookingSchema.safeParse({ ...valid, patientEmail: 'no-es-email' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('email válido');
    }
  });

  it('rechaza especialidad inexistente', () => {
    const result = bookingSchema.safeParse({ ...valid, specialty: 'NEUROLOGIA' });
    expect(result.success).toBe(false);
  });

  it('rechaza startTime vacío', () => {
    const result = bookingSchema.safeParse({ ...valid, startTime: '' });
    expect(result.success).toBe(false);
  });

  it('recorta espacios del nombre y del email', () => {
    const result = bookingSchema.safeParse({
      ...valid,
      patientName: '  Ana Torres  ',
      patientEmail: '  ana@correo.com  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.patientName).toBe('Ana Torres');
      expect(result.data.patientEmail).toBe('ana@correo.com');
    }
  });
});
