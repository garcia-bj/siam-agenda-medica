import type { AppointmentFilterStatus, Specialty } from '@/types/api';
import { ApiRequestError } from './client';
import { handleMock } from './mocks';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

export interface ReportQuery {
  from?: string;
  to?: string;
  specialty?: Specialty;
  status?: AppointmentFilterStatus;
  format?: 'csv' | 'xlsx';
}

export async function downloadReport(query: ReportQuery = {}): Promise<void> {
  const params = new URLSearchParams();
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.specialty) params.set('specialty', query.specialty);
  if (query.status) params.set('status', query.status);
  if (query.format) params.set('format', query.format);

  const qs = params.toString();
  const path = `/reports/appointments${qs ? `?${qs}` : ''}`;

  let blob: Blob;
  let filename: string | undefined;

  if (USE_MOCKS) {
    const result = await handleMock<{ blob: Blob; filename: string }>(path, { method: 'GET' });
    blob = result.blob;
    filename = result.filename;
  } else {
    const url = `${BASE_URL}${path}`;
    let res: Response;

    try {
      res = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });
    } catch {
      throw new ApiRequestError(500, 'INTERNAL_ERROR', 'Error de conexión. Verifica tu red.', []);
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiRequestError(res.status, body.code || 'INTERNAL_ERROR', body.message ?? 'Error al descargar el reporte', body.details || []);
    }

    blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition');
    if (disposition) {
      const match = disposition.match(/filename="([^"]+)"/);
      if (match) {
        filename = match[1];
      } else {
        const starMatch = disposition.match(/filename\*=UTF-8''([^;]+)/);
        if (starMatch) {
          filename = decodeURIComponent(starMatch[1]);
        }
      }
    }
  }

  const formatExt = query.format === 'xlsx' ? 'xlsx' : 'csv';
  const finalFilename = filename || `reporte-${query.from || 'inicio'}-${query.to || 'fin'}.${formatExt}`;

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = finalFilename;
  a.click();
  URL.revokeObjectURL(objectUrl);
}
