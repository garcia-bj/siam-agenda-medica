import { INestApplication, ValidationError, ValidationPipe } from '@nestjs/common';
import { ApiException, ErrorDetail } from './common/api-exception.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

/** Configuración global de la app. La usan main.ts y los tests e2e, para que prueben lo mismo que corre. */
export function setupApp(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.enableCors({ origin: 'http://localhost:3000', exposedHeaders: ['Content-Disposition'] });
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

export function toDetails(errors: ValidationError[], parent = ''): ErrorDetail[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({ field, message }));
    return [...own, ...toDetails(error.children ?? [], field)];
  });
}
