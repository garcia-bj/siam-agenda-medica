import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { ApiErrorBody, ApiException } from '../api-exception.js';

/** Convierte cualquier error en el formato del contrato: { statusCode, code, message, details }. */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const body = toErrorBody(exception);
    if (body.statusCode >= 500) this.logger.error(exception);
    host.switchToHttp().getResponse<Response>().status(body.statusCode).json(body);
  }
}

export function toErrorBody(exception: unknown): ApiErrorBody {
  if (exception instanceof ApiException) return exception.getResponse() as ApiErrorBody;
  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    if (statusCode === 404) return { statusCode, code: 'NOT_FOUND', message: 'Recurso no encontrado', details: [] };
    if (statusCode < 500) return { statusCode, code: 'VALIDATION_ERROR', message: 'Solicitud inválida', details: [] };
  }
  return { statusCode: 500, code: 'INTERNAL_ERROR', message: 'Error interno del servidor', details: [] };
}
