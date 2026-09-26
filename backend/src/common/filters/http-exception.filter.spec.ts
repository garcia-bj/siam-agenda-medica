import { BadRequestException, HttpException, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { ApiException } from '../api-exception.js';
import { toErrorBody } from './http-exception.filter.js';

describe('toErrorBody', () => {
  it('devuelve tal cual el cuerpo de una ApiException', () => {
    const details = [{ field: 'startTime', message: 'inválido' }];

    expect(toErrorBody(new ApiException(409, 'SLOT_TAKEN', 'Ocupado', details))).toEqual({
      statusCode: 409,
      code: 'SLOT_TAKEN',
      message: 'Ocupado',
      details,
    });
  });

  it('convierte un 404 de Nest en NOT_FOUND', () => {
    expect(toErrorBody(new NotFoundException('Cannot GET /x'))).toEqual({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Recurso no encontrado',
      details: [],
    });
  });

  it('convierte otros 4xx de Nest en VALIDATION_ERROR sin exponer el mensaje original', () => {
    expect(toErrorBody(new BadRequestException('Unexpected token }'))).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Solicitud inválida',
      details: [],
    });
    expect(toErrorBody(new PayloadTooLargeException()).statusCode).toBe(413);
  });

  it.each([new Error('fallo'), new HttpException('caído', 503), 'texto', undefined])(
    'convierte %s en 500 INTERNAL_ERROR',
    (exception) => {
      expect(toErrorBody(exception)).toEqual({
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'Error interno del servidor',
        details: [],
      });
    },
  );
});
