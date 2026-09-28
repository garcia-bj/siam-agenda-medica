import { Injectable } from '@nestjs/common';
import ExcelJS from 'exceljs';
import { DateTime } from 'luxon';
import { ApiException } from '../common/api-exception.js';
import { SPECIALTY_LABELS, Specialty } from '../common/constants/specialties.js';
import { PrismaService } from '../database/prisma.service.js';
import { ScheduleService } from '../schedule/schedule.service.js';
import { ReportQueryDto } from './dto/report-query.dto.js';

export interface ReportFileResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

export const REPORT_HEADERS = [
  'ID',
  'Paciente',
  'Email',
  'Especialidad',
  'Fecha',
  'Hora inicio',
  'Hora fin',
  'Estado',
  'Creada',
] as const;

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleService: ScheduleService,
  ) {}

  /**
   * Genera el archivo de reporte de citas en formato CSV o Excel (XLSX).
   * - Fechas por defecto: lunes a viernes de la semana actual en CLINIC_TZ.
   * - Valida from <= to y rango <= 92 días inclusivos.
   * - Columnas: ID, Paciente, Email, Especialidad, Fecha, Hora inicio, Hora fin, Estado, Creada.
   * - Fechas y horas en CLINIC_TZ; especialidad y estado en español.
   * - CSV en UTF-8 con BOM y escape RFC 4180.
   * - Excel con encabezados en negrita y columnas de ancho ajustado.
   */
  async generateReport(
    query: ReportQueryDto,
    now?: DateTime | Date | string,
  ): Promise<ReportFileResult> {
    const tz = this.scheduleService.clinicTz;
    const currentNow = this.resolveNow(now, tz);

    const defaultFrom = currentNow.startOf('week').toFormat('yyyy-MM-dd');
    const defaultTo = currentNow.startOf('week').set({ weekday: 5 }).toFormat('yyyy-MM-dd');

    const from = query.from || defaultFrom;
    const to = query.to || defaultTo;
    const format = query.format || 'csv';
    const status = query.status || 'ALL';

    const fromDt = DateTime.fromFormat(from, 'yyyy-MM-dd', { zone: tz });
    const toDt = DateTime.fromFormat(to, 'yyyy-MM-dd', { zone: tz });

    if (!fromDt.isValid || !toDt.isValid) {
      throw new ApiException(400, 'VALIDATION_ERROR', 'Fecha inválida. Debe tener formato YYYY-MM-DD');
    }

    if (fromDt > toDt) {
      throw new ApiException(400, 'VALIDATION_ERROR', 'Datos inválidos', [
        { field: 'from', message: 'No puede ser posterior a la fecha final' },
      ]);
    }

    const rangeDays = Math.round(toDt.diff(fromDt, 'days').days) + 1;
    if (rangeDays > 92) {
      throw new ApiException(400, 'VALIDATION_ERROR', 'Datos inválidos', [
        { field: 'to', message: 'El rango no puede superar 92 días' },
      ]);
    }

    const startOfFrom = fromDt.startOf('day').toJSDate();
    const endOfTo = toDt.endOf('day').toJSDate();

    const appointments = await this.prisma.appointment.findMany({
      where: {
        startTime: { gte: startOfFrom, lte: endOfTo },
        ...(query.specialty ? { specialty: query.specialty } : {}),
        ...(status !== 'ALL' ? { status } : {}),
      },
      orderBy: { startTime: 'asc' },
    });

    const rows: string[][] = appointments.map((apt) => {
      const startInTz = DateTime.fromJSDate(apt.startTime).setZone(tz);
      const endInTz = DateTime.fromJSDate(apt.endTime).setZone(tz);
      const createdInTz = DateTime.fromJSDate(apt.createdAt).setZone(tz);

      return [
        apt.id,
        apt.patientName,
        apt.patientEmail,
        SPECIALTY_LABELS[apt.specialty as Specialty] || apt.specialty,
        startInTz.toFormat('yyyy-MM-dd'),
        startInTz.toFormat('HH:mm'),
        endInTz.toFormat('HH:mm'),
        apt.status === 'ACTIVE' ? 'Activa' : 'Cancelada',
        createdInTz.toFormat('yyyy-MM-dd HH:mm:ss'),
      ];
    });

    const filename = `siam-citas_${from}_${to}.${format}`;

    if (format === 'xlsx') {
      const buffer = await this.buildExcel(rows);
      return {
        buffer,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        filename,
      };
    }

    const buffer = this.buildCsv(rows);
    return {
      buffer,
      contentType: 'text/csv; charset=utf-8',
      filename,
    };
  }

  private buildCsv(rows: string[][]): Buffer {
    const BOM = '\uFEFF';
    const allRows = [REPORT_HEADERS as unknown as string[], ...rows];
    const csvContent =
      allRows
        .map((row) => row.map((field) => this.escapeCsvField(field)).join(','))
        .join('\r\n') + '\r\n';

    return Buffer.from(BOM + csvContent, 'utf-8');
  }

  private escapeCsvField(val: string | null | undefined): string {
    if (val === null || val === undefined) return '';
    let str = String(val);
    if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
    if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  }

  private async buildExcel(rows: string[][]): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SIAM';
    const sheet = workbook.addWorksheet('Citas');

    sheet.columns = REPORT_HEADERS.map((header) => ({
      header,
      key: header,
    }));

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };

    for (const row of rows) {
      sheet.addRow(row);
    }

    sheet.columns.forEach((column) => {
      let maxLen = column.header ? column.header.toString().length : 10;
      if (column.eachCell) {
        column.eachCell({ includeEmpty: false }, (cell) => {
          const rawVal = cell.value;
          let val = '';
          if (rawVal !== null && rawVal !== undefined) {
            if (typeof rawVal === 'string' || typeof rawVal === 'number' || typeof rawVal === 'boolean') {
              val = `${rawVal}`;
            } else if (rawVal instanceof Date) {
              val = rawVal.toISOString();
            } else if (typeof rawVal === 'object' && 'text' in rawVal && typeof rawVal.text === 'string') {
              val = rawVal.text;
            }
          }
          if (val.length > maxLen) {
            maxLen = val.length;
          }
        });
      }
      column.width = Math.min(Math.max(maxLen + 3, 12), 40);
    });

    const arrayBuffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }

  private resolveNow(now: DateTime | Date | string | undefined, tz: string): DateTime {
    if (!now) {
      return DateTime.now().setZone(tz);
    }
    if (now instanceof DateTime) {
      return now.setZone(tz);
    }
    if (now instanceof Date) {
      return DateTime.fromJSDate(now, { zone: tz });
    }
    return DateTime.fromISO(now, { zone: tz });
  }
}
