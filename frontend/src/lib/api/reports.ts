import type { AppointmentFilterStatus, Specialty } from '@/types/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

import { ApiRequestError } from './client';

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
  const url = `${BASE_URL}/reports/appointments${qs ? `?${qs}` : ''}`;

  const res = await fetch(url);

  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiRequestError(res.status, body.code || 'INTERNAL_ERROR', body.message ?? 'Error al descargar el reporte', body.details || []);
  }

  const disposition = res.headers.get('Content-Disposition') ?? '';
  const match = disposition.match(/filename="(.+)"/);
  const filename = match?.[1] ?? 'reporte.csv';

  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
