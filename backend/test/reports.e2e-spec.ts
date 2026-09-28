import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import ExcelJS from 'exceljs';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { REPORT_HEADERS } from '../src/reports/reports.service.js';
import { setupApp } from '../src/setup-app.js';

const binaryParser = (res: any, callback: (err: Error | null, body: Buffer) => void) => {
  const data: Buffer[] = [];
  res.on('data', (chunk: Buffer) => data.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(data)));
};

describe('GET /api/reports/appointments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    setupApp(app);
    await app.init();

    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.appointment.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Descarga de archivos y headers HTTP', () => {
    it('200: descarga CSV con BOM, Content-Disposition y fechas en hora local', async () => {
      // 2030-06-17 es lunes
      // 09:00 (-04:00) = 13:00 UTC
      await prisma.appointment.createMany({
        data: [
          {
            id: 'apt-pediatria',
            patientName: 'Lucía Méndez',
            patientEmail: 'lucia@correo.com',
            specialty: 'PEDIATRIA',
            startTime: new Date('2030-06-17T13:00:00Z'),
            endTime: new Date('2030-06-17T13:30:00Z'),
            status: 'ACTIVE',
            createdAt: new Date('2030-06-10T14:00:00Z'),
          },
          {
            id: 'apt-cardio',
            patientName: 'Roberto Ruiz',
            patientEmail: 'roberto@correo.com',
            specialty: 'CARDIOLOGIA',
            startTime: new Date('2030-06-17T14:00:00Z'),
            endTime: new Date('2030-06-17T14:30:00Z'),
            status: 'CANCELLED',
            cancelledAt: new Date('2030-06-11T15:00:00Z'),
            createdAt: new Date('2030-06-10T14:30:00Z'),
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .get('/api/reports/appointments?from=2030-06-17&to=2030-06-21&format=csv')
        .expect(200);

      // Headers correctos
      expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(res.headers['content-disposition']).toBe(
        'attachment; filename="siam-citas_2030-06-17_2030-06-21.csv"',
      );
      // Header expuesto para CORS
      expect(res.headers['access-control-expose-headers']).toBe('Content-Disposition');

      // Buffer con BOM
      const buffer = res.body instanceof Buffer ? res.body : Buffer.from(res.text, 'utf-8');
      expect(buffer[0]).toBe(0xef);
      expect(buffer[1]).toBe(0xbb);
      expect(buffer[2]).toBe(0xbf);

      const content = buffer.toString('utf-8');
      const lines = content.slice(1).trim().split('\r\n');
      expect(lines).toHaveLength(3); // Encabezados + 2 citas
      expect(lines[0]).toBe(REPORT_HEADERS.join(','));

      // Fila 1: Pediatría, Activa
      expect(lines[1]).toContain('apt-pediatria,Lucía Méndez,lucia@correo.com,Pediatría,2030-06-17,09:00,09:30,Activa');
      // Fila 2: Cardiología, Cancelada
      expect(lines[2]).toContain('apt-cardio,Roberto Ruiz,roberto@correo.com,Cardiología,2030-06-17,10:00,10:30,Cancelada');
    });

    it('200: mitiga inyección de fórmulas en CSV anteponiendo comilla simple', async () => {
      await prisma.appointment.create({
        data: {
          id: 'apt-inj',
          patientName: '=HYPERLINK("http://evil.test","Ver")',
          patientEmail: 'victim@correo.com',
          specialty: 'MEDICINA_GENERAL',
          startTime: new Date('2030-06-17T13:00:00Z'),
          endTime: new Date('2030-06-17T13:30:00Z'),
          status: 'ACTIVE',
          createdAt: new Date('2030-06-10T14:00:00Z'),
        },
      });

      const res = await request(app.getHttpServer())
        .get('/api/reports/appointments?from=2030-06-17&to=2030-06-21&format=csv')
        .expect(200);

      const buffer = res.body instanceof Buffer ? res.body : Buffer.from(res.text, 'utf-8');
      const content = buffer.toString('utf-8');
      expect(content).toContain('"\'=HYPERLINK(""http://evil.test"",""Ver"")"');
    });

    it('200: descarga Excel con format=xlsx, encabezados en negrita y ancho ajustado', async () => {
      await prisma.appointment.create({
        data: {
          id: 'apt-excel',
          patientName: 'Esteban Paz',
          patientEmail: 'esteban@correo.com',
          specialty: 'MEDICINA_GENERAL',
          startTime: new Date('2030-06-17T13:00:00Z'),
          endTime: new Date('2030-06-17T13:30:00Z'),
          status: 'ACTIVE',
        },
      });

      const res = await request(app.getHttpServer())
        .get('/api/reports/appointments?from=2030-06-17&to=2030-06-21&format=xlsx')
        .buffer(true)
        .parse(binaryParser)
        .expect(200);

      expect(res.headers['content-type']).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(res.headers['content-disposition']).toBe(
        'attachment; filename="siam-citas_2030-06-17_2030-06-21.xlsx"',
      );

      const buffer = res.body as Buffer;
      // Firma ZIP de archivo XLSX (PK)
      expect(buffer.slice(0, 2).toString()).toBe('PK');

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
      const sheet = workbook.getWorksheet('Citas');
      expect(sheet).toBeDefined();

      const headerRow = sheet!.getRow(1);
      expect(headerRow.font?.bold).toBe(true);

      const dataRow = sheet!.getRow(2);
      expect(dataRow.getCell(2).value).toBe('Esteban Paz');
      expect(dataRow.getCell(4).value).toBe('Medicina General');
      expect(dataRow.getCell(8).value).toBe('Activa');
    });

    it('200: rango sin citas genera archivo con solo encabezados', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports/appointments?from=2030-06-17&to=2030-06-21&format=csv')
        .expect(200);

      const buffer = res.body instanceof Buffer ? res.body : Buffer.from(res.text, 'utf-8');
      const content = buffer.toString('utf-8');
      const lines = content.slice(1).trim().split('\r\n');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toBe(REPORT_HEADERS.join(','));
    });

    it('200: por defecto usa format=csv y la semana actual si no se envían parámetros', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports/appointments')
        .expect(200);

      expect(res.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(res.headers['content-disposition']).toMatch(
        /^attachment; filename="siam-citas_\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}\.csv"$/,
      );
    });

    it('filtra por specialty y status correctamente', async () => {
      await prisma.appointment.createMany({
        data: [
          {
            patientName: 'Ana Activa',
            patientEmail: 'ana@correo.com',
            specialty: 'PEDIATRIA',
            startTime: new Date('2030-06-17T13:00:00Z'),
            endTime: new Date('2030-06-17T13:30:00Z'),
            status: 'ACTIVE',
          },
          {
            patientName: 'Ana Cancelada',
            patientEmail: 'anac@correo.com',
            specialty: 'PEDIATRIA',
            startTime: new Date('2030-06-17T14:00:00Z'),
            endTime: new Date('2030-06-17T14:30:00Z'),
            status: 'CANCELLED',
            cancelledAt: new Date(),
          },
          {
            patientName: 'Carlos Activo',
            patientEmail: 'carlos@correo.com',
            specialty: 'CARDIOLOGIA',
            startTime: new Date('2030-06-17T15:00:00Z'),
            endTime: new Date('2030-06-17T15:30:00Z'),
            status: 'ACTIVE',
          },
        ],
      });

      const res = await request(app.getHttpServer())
        .get('/api/reports/appointments?from=2030-06-17&to=2030-06-21&specialty=PEDIATRIA&status=ACTIVE&format=csv')
        .expect(200);

      const buffer = res.body instanceof Buffer ? res.body : Buffer.from(res.text, 'utf-8');
      const lines = buffer.toString('utf-8').slice(1).trim().split('\r\n');
      expect(lines).toHaveLength(2); // Encabezado + 1 cita activa de pediatría
      expect(lines[1]).toContain('Ana Activa');
      expect(lines[1]).not.toContain('Ana Cancelada');
      expect(lines[1]).not.toContain('Carlos Activo');
    });
  });

  describe('Validaciones y errores 400', () => {
    it('400 VALIDATION_ERROR si from es posterior a to', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports/appointments?from=2030-06-21&to=2030-06-17')
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          { field: 'from', message: 'No puede ser posterior a la fecha final' },
        ]),
      );
    });

    it('400 VALIDATION_ERROR si el rango supera los 92 días inclusivos', async () => {
      // 2030-01-01 a 2030-04-03 son 93 días
      const res = await request(app.getHttpServer())
        .get('/api/reports/appointments?from=2030-01-01&to=2030-04-03')
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
      expect(res.body.details).toEqual(
        expect.arrayContaining([
          { field: 'to', message: 'El rango no puede superar 92 días' },
        ]),
      );
    });

    it('400 VALIDATION_ERROR si from tiene formato inválido o fecha inexistente', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports/appointments?from=2030-02-31')
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'from' })]),
      );
    });

    it('400 VALIDATION_ERROR si format no es soportado (ej. pdf)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports/appointments?format=pdf')
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'format' })]),
      );
    });

    it('400 VALIDATION_ERROR si status es inválido', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports/appointments?status=PENDIENTE')
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
      expect(res.body.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'status' })]),
      );
    });

    it('400 VALIDATION_ERROR si se envía un parámetro no permitido', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reports/appointments?extra=valor')
        .expect(400);

      expect(res.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
      expect(res.body.details).toEqual(
        expect.arrayContaining([{ field: 'extra', message: 'Campo no permitido' }]),
      );
    });
  });
});
