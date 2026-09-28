import { Test, TestingModule } from '@nestjs/testing';
import ExcelJS from 'exceljs';
import { vi } from 'vitest';
import { PrismaService } from '../database/prisma.service.js';
import { ScheduleService } from '../schedule/schedule.service.js';
import { REPORT_HEADERS, ReportsService } from './reports.service.js';

describe('ReportsService', () => {
  let service: ReportsService;
  let prismaMock: { appointment: { findMany: ReturnType<typeof vi.fn> } };

  beforeEach(async () => {
    prismaMock = {
      appointment: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        ScheduleService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('debe estar definido', () => {
    expect(service).toBeDefined();
  });

  describe('Generación de CSV', () => {
    it('genera un CSV con BOM, encabezados y formato correcto en hora de La Paz y español', async () => {
      // 2026-09-28 09:00 en La Paz (UTC-4) = 13:00 UTC
      const fakeAppointments = [
        {
          id: 'apt-1',
          patientName: 'Carlos Gómez',
          patientEmail: 'carlos@correo.com',
          specialty: 'PEDIATRIA',
          startTime: new Date('2026-09-28T13:00:00Z'),
          endTime: new Date('2026-09-28T13:30:00Z'),
          status: 'ACTIVE',
          createdAt: new Date('2026-09-25T18:00:00Z'), // 14:00 local
        },
        {
          id: 'apt-2',
          patientName: 'María López',
          patientEmail: 'maria@correo.com',
          specialty: 'CARDIOLOGIA',
          startTime: new Date('2026-09-28T14:00:00Z'), // 10:00 local
          endTime: new Date('2026-09-28T14:30:00Z'),
          status: 'CANCELLED',
          createdAt: new Date('2026-09-25T18:30:00Z'),
        },
      ];

      prismaMock.appointment.findMany.mockResolvedValueOnce(fakeAppointments);

      const result = await service.generateReport({
        from: '2026-09-28',
        to: '2026-10-02',
        format: 'csv',
      });

      expect(result.contentType).toBe('text/csv; charset=utf-8');
      expect(result.filename).toBe('siam-citas_2026-09-28_2026-10-02.csv');

      const csvText = result.buffer.toString('utf-8');
      // Debe comenzar con el BOM de UTF-8 (\uFEFF)
      expect(csvText.charCodeAt(0)).toBe(0xfeff);

      const lines = csvText.slice(1).trim().split('\r\n');
      expect(lines).toHaveLength(3); // Encabezado + 2 filas
      expect(lines[0]).toBe(REPORT_HEADERS.join(','));

      // Fila 1: Pediatría, Activa
      expect(lines[1]).toBe(
        'apt-1,Carlos Gómez,carlos@correo.com,Pediatría,2026-09-28,09:00,09:30,Activa,2026-09-25 14:00:00',
      );
      // Fila 2: Cardiología, Cancelada
      expect(lines[2]).toBe(
        'apt-2,María López,maria@correo.com,Cardiología,2026-09-28,10:00,10:30,Cancelada,2026-09-25 14:30:00',
      );
    });

    it('escapa comas, comillas dobles y saltos de línea según RFC 4180', async () => {
      const fakeAppointments = [
        {
          id: 'apt-special',
          patientName: 'Pérez, "Pepe"\nJunior',
          patientEmail: 'pepe,jr@correo.com',
          specialty: 'MEDICINA_GENERAL',
          startTime: new Date('2026-09-28T13:00:00Z'),
          endTime: new Date('2026-09-28T13:30:00Z'),
          status: 'ACTIVE',
          createdAt: new Date('2026-09-25T18:00:00Z'),
        },
      ];

      prismaMock.appointment.findMany.mockResolvedValueOnce(fakeAppointments);

      const result = await service.generateReport({
        from: '2026-09-28',
        to: '2026-10-02',
        format: 'csv',
      });

      const csvText = result.buffer.toString('utf-8');
      // "Pérez, ""Pepe""\nJunior"
      expect(csvText).toContain('"Pérez, ""Pepe""\nJunior"');
      expect(csvText).toContain('"pepe,jr@correo.com"');
    });

    it('mitiga inyección de fórmulas CSV anteponiendo comilla simple a campos que inician con =, +, -, @, tab o CR', async () => {
      const fakeAppointments = [
        {
          id: 'apt-formula-1',
          patientName: '=1+1',
          patientEmail: '+cmd|"/C calc"!A0@correo.com',
          specialty: 'MEDICINA_GENERAL',
          startTime: new Date('2026-09-28T13:00:00Z'),
          endTime: new Date('2026-09-28T13:30:00Z'),
          status: 'ACTIVE',
          createdAt: new Date('2026-09-25T18:00:00Z'),
        },
        {
          id: 'apt-formula-2',
          patientName: '=HYPERLINK("http://evil.test","Ver")',
          patientEmail: '@malicious@correo.com',
          specialty: 'PEDIATRIA',
          startTime: new Date('2026-09-28T14:00:00Z'),
          endTime: new Date('2026-09-28T14:30:00Z'),
          status: 'ACTIVE',
          createdAt: new Date('2026-09-25T18:00:00Z'),
        },
      ];

      prismaMock.appointment.findMany.mockResolvedValueOnce(fakeAppointments);

      const result = await service.generateReport({
        from: '2026-09-28',
        to: '2026-10-02',
        format: 'csv',
      });

      const csvText = result.buffer.toString('utf-8');
      expect(csvText).toContain("'=1+1");
      expect(csvText).toContain("'+cmd");
      expect(csvText).toContain('"\'=HYPERLINK(""http://evil.test"",""Ver"")"');
      expect(csvText).toContain("'@malicious@correo.com");
    });

    it('rango sin citas devuelve archivo CSV solo con encabezados', async () => {
      prismaMock.appointment.findMany.mockResolvedValueOnce([]);

      const result = await service.generateReport({
        from: '2026-09-28',
        to: '2026-10-02',
        format: 'csv',
      });

      const csvText = result.buffer.toString('utf-8');
      expect(csvText.charCodeAt(0)).toBe(0xfeff);
      const lines = csvText.slice(1).trim().split('\r\n');
      expect(lines).toHaveLength(1);
      expect(lines[0]).toBe(REPORT_HEADERS.join(','));
    });
  });

  describe('Generación de Excel (XLSX)', () => {
    it('genera un archivo XLSX con encabezados en negrita y columnas de ancho ajustado', async () => {
      const fakeAppointments = [
        {
          id: 'apt-1',
          patientName: 'Ana Pérez',
          patientEmail: 'ana@correo.com',
          specialty: 'PEDIATRIA',
          startTime: new Date('2026-09-28T13:00:00Z'),
          endTime: new Date('2026-09-28T13:30:00Z'),
          status: 'ACTIVE',
          createdAt: new Date('2026-09-25T18:00:00Z'),
        },
      ];

      prismaMock.appointment.findMany.mockResolvedValueOnce(fakeAppointments);

      const result = await service.generateReport({
        from: '2026-09-28',
        to: '2026-10-02',
        format: 'xlsx',
      });

      expect(result.contentType).toBe(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      expect(result.filename).toBe('siam-citas_2026-09-28_2026-10-02.xlsx');
      // Cabecera ZIP (PK)
      expect(result.buffer.slice(0, 2).toString()).toBe('PK');

      // Leer el workbook generado con ExcelJS para verificar estructura
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(result.buffer as unknown as ArrayBuffer);
      const sheet = workbook.getWorksheet('Citas');
      expect(sheet).toBeDefined();

      // Verificar fila 1 (encabezados en negrita)
      const headerRow = sheet!.getRow(1);
      expect(headerRow.font?.bold).toBe(true);
      expect(headerRow.values).toEqual(
        expect.arrayContaining([expect.anything(), ...REPORT_HEADERS]),
      );

      // Verificar fila 2 (datos)
      const dataRow = sheet!.getRow(2);
      expect(dataRow.getCell(2).value).toBe('Ana Pérez');
      expect(dataRow.getCell(4).value).toBe('Pediatría');
      expect(dataRow.getCell(8).value).toBe('Activa');

      // Verificar que las columnas tengan ancho configurado
      expect(sheet!.getColumn(1).width).toBeGreaterThanOrEqual(10);
    });

    it('rango sin citas genera archivo XLSX con solo encabezados', async () => {
      prismaMock.appointment.findMany.mockResolvedValueOnce([]);

      const result = await service.generateReport({
        from: '2026-09-28',
        to: '2026-10-02',
        format: 'xlsx',
      });

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(result.buffer as unknown as ArrayBuffer);
      const sheet = workbook.getWorksheet('Citas');
      expect(sheet).toBeDefined();
      expect(sheet!.actualRowCount).toBe(1);
    });
  });

  describe('Validaciones y filtros', () => {
    it('lanza 400 con details si from es posterior a to', async () => {
      await expect(
        service.generateReport({ from: '2026-10-02', to: '2026-09-28' }),
      ).rejects.toMatchObject({
        status: 400,
        response: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            { field: 'from', message: 'No puede ser posterior a la fecha final' },
          ]),
        }),
      });
    });

    it('lanza 400 con details si el rango supera los 92 días inclusivos', async () => {
      // 2026-01-01 a 2026-04-03 son 93 días contando ambos extremos
      await expect(
        service.generateReport({ from: '2026-01-01', to: '2026-04-03' }),
      ).rejects.toMatchObject({
        status: 400,
        response: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          details: expect.arrayContaining([
            { field: 'to', message: 'El rango no puede superar 92 días' },
          ]),
        }),
      });
    });

    it('acepta un rango de hasta 92 días inclusivos exactos', async () => {
      // 2026-01-01 a 2026-04-02 son 92 días
      const result = await service.generateReport({ from: '2026-01-01', to: '2026-04-02' });
      expect(result.filename).toBe('siam-citas_2026-01-01_2026-04-02.csv');
    });

    it('si no vienen from y to, usa lunes a viernes de la semana actual', async () => {
      const fakeNow = '2026-09-30T10:00:00-04:00';
      const result = await service.generateReport({}, fakeNow);

      expect(result.filename).toBe('siam-citas_2026-09-28_2026-10-02.csv');
    });

    it('filtra por specialty y status en la consulta a base de datos', async () => {
      await service.generateReport({
        from: '2026-09-28',
        to: '2026-10-02',
        specialty: 'DERMATOLOGIA',
        status: 'CANCELLED',
      });

      expect(prismaMock.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            specialty: 'DERMATOLOGIA',
            status: 'CANCELLED',
          }),
          orderBy: { startTime: 'asc' },
        }),
      );
    });
  });
});
