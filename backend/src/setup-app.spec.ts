import type { ValidationError } from '@nestjs/common';
import { corsOrigin, toDetails } from './setup-app.js';

const error = (property: string, constraints?: Record<string, string>, children: ValidationError[] = []): ValidationError => ({
  property,
  constraints,
  children,
});

describe('toDetails', () => {
  it('devuelve un detalle por cada regla que falla en cada campo', () => {
    const errors = [
      error('patientEmail', { isEmail: 'Debe ser un email válido' }),
      error('patientName', { isString: 'Debe ser texto', isLength: 'Entre 2 y 100 caracteres' }),
    ];

    expect(toDetails(errors)).toEqual([
      { field: 'patientEmail', message: 'Debe ser un email válido' },
      { field: 'patientName', message: 'Debe ser texto' },
      { field: 'patientName', message: 'Entre 2 y 100 caracteres' },
    ]);
  });

  it('arma la ruta con punto para campos anidados', () => {
    const errors = [error('filtro', undefined, [error('desde', { isDateString: 'Fecha inválida' })])];

    expect(toDetails(errors)).toEqual([{ field: 'filtro.desde', message: 'Fecha inválida' }]);
  });

  it('traduce el error de campo no permitido, que class-validator solo da en inglés', () => {
    const errors = [error('extra', { whitelistValidation: 'property extra should not exist' })];

    expect(toDetails(errors)).toEqual([{ field: 'extra', message: 'Campo no permitido' }]);
  });

  it('devuelve un arreglo vacío si no hay errores', () => {
    expect(toDetails([])).toEqual([]);
  });
});

describe('corsOrigin', () => {
  const original = process.env.CORS_ORIGIN;
  afterEach(() => {
    process.env.CORS_ORIGIN = original;
  });

  it('por defecto autoriza al front en localhost:3000', () => {
    delete process.env.CORS_ORIGIN;
    expect(corsOrigin()).toBe('http://localhost:3000');
  });

  it('usa CORS_ORIGIN cuando está definido (front publicado en otro puerto)', () => {
    process.env.CORS_ORIGIN = 'http://localhost:3100';
    expect(corsOrigin()).toBe('http://localhost:3100');
  });
});
