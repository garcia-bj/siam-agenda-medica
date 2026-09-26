import { Body, Controller, Get, INestApplication, Logger, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsEmail, IsString, Length } from 'class-validator';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { setupApp } from './../src/setup-app.js';

class ProbeDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsEmail()
  email: string;
}

@Controller('probe')
class ProbeController {
  @Post()
  create(@Body() dto: ProbeDto) {
    return dto;
  }

  @Get('boom')
  boom() {
    throw new Error('fallo interno');
  }
}

describe('Estructura base (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health responde 200', () => {
    return request(app.getHttpServer()).get('/api/health').expect(200, { status: 'ok' });
  });

  it('una ruta inexistente responde 404 con el formato del contrato', () => {
    return request(app.getHttpServer())
      .get('/api/no-existe')
      .expect(404, { statusCode: 404, code: 'NOT_FOUND', message: 'Recurso no encontrado', details: [] });
  });

  it('un body inválido responde 400 VALIDATION_ERROR con details por campo', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/probe')
      .send({ name: 'A', email: 'no-es-email', extra: 1 })
      .expect(400);

    expect(res.body).toMatchObject({ statusCode: 400, code: 'VALIDATION_ERROR', message: 'Datos inválidos' });
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        { field: 'extra', message: 'Campo no permitido' },
        expect.objectContaining({ field: 'name' }),
        expect.objectContaining({ field: 'email' }),
      ]),
    );
    expect(res.body.details).toHaveLength(3);
  });

  it('un JSON mal formado responde 400 VALIDATION_ERROR', () => {
    return request(app.getHttpServer())
      .post('/api/probe')
      .set('Content-Type', 'application/json')
      .send('{"name":')
      .expect(400)
      .expect(({ body }) => expect(body.code).toBe('VALIDATION_ERROR'));
  });

  it('un error inesperado responde 500 INTERNAL_ERROR sin filtrar el detalle', () => {
    return request(app.getHttpServer())
      .get('/api/probe/boom')
      .expect(500, { statusCode: 500, code: 'INTERNAL_ERROR', message: 'Error interno del servidor', details: [] });
  });

  it('permite CORS desde el front en localhost:3000 y expone Content-Disposition', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .set('Origin', 'http://localhost:3000')
      .expect('Access-Control-Allow-Origin', 'http://localhost:3000')
      .expect('Access-Control-Expose-Headers', 'Content-Disposition');
  });

  it('no autoriza por CORS a otro origen', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').set('Origin', 'http://otro-sitio.com');

    expect(res.headers['access-control-allow-origin']).not.toBe('http://otro-sitio.com');
  });
});
