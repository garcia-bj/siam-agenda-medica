import { INestApplication, ValidationError, ValidationPipe } from '@nestjs/common';
import { ApiException, ErrorDetail } from './common/api-exception.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

/** Configuración global de la app. La usan main.ts y los tests e2e, para que prueben lo mismo que corre. */
export function setupApp(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.enableCors({ origin: corsOrigin(), exposedHeaders: ['Content-Disposition'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => new ApiException(400, 'VALIDATION_ERROR', 'Datos inválidos', toDetails(errors)),
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
}

/** Origen del front autorizado por CORS. En Docker cambia si el front se publica en otro puerto. */
export function corsOrigin(): string {
  return process.env.CORS_ORIGIN || 'http://localhost:3000';
}

export function toDetails(errors: ValidationError[], parent = ''): ErrorDetail[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    // class-validator no deja traducir el error de campo no permitido desde los DTO: se traduce aquí.
    const own = Object.entries(error.constraints ?? {}).map(([rule, message]) => ({
      field,
      message: rule === 'whitelistValidation' ? 'Campo no permitido' : message,
    }));
    return [...own, ...toDetails(error.children ?? [], field)];
  });
}
