import type {
  Appointment,
  AppointmentsQuery,
  AppointmentsResponse,
  CreateAppointmentDto,
  UpdateAppointmentDto,
} from '@/types/api';
import { apiFetch } from './client';

export function fetchAppointments(
  query: AppointmentsQuery = {},
): Promise<AppointmentsResponse> {
  const params = new URLSearchParams();
  if (query.specialty) params.set('specialty', query.specialty);
  if (query.date) params.set('date', query.date);
  if (query.status) params.set('status', query.status);

  const qs = params.toString();
  return apiFetch<AppointmentsResponse>(`/appointments${qs ? `?${qs}` : ''}`);
}

export function createAppointment(
  dto: CreateAppointmentDto,
): Promise<Appointment> {
  return apiFetch<Appointment>('/appointments', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export function rescheduleAppointment(
  id: string,
  dto: UpdateAppointmentDto,
): Promise<Appointment> {
  return apiFetch<Appointment>(`/appointments/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

export function cancelAppointment(id: string): Promise<void> {
  return apiFetch<void>(`/appointments/${id}`, { method: 'DELETE' });
}
