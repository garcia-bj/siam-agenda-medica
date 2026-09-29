import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { rescheduleAppointment } from '@/lib/api/appointments';
import { ApiRequestError } from '@/lib/api/client';
import type { Appointment } from '@/types/api';
import { useRescheduleAppointment } from './useRescheduleAppointment';

vi.mock('@/lib/api/appointments', () => ({ rescheduleAppointment: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), info: vi.fn() } }));

const rescheduleMock = vi.mocked(rescheduleAppointment);

const appointment: Appointment = {
  id: 'appt-1',
  patientName: 'Carlos Méndez',
  patientEmail: 'carlos@correo.com',
  specialty: 'MEDICINA_GENERAL',
  doctorName: 'Dr. Martín Gutiérrez',
  startTime: '2026-09-28T11:30:00-04:00',
  endTime: '2026-09-28T12:00:00-04:00',
  status: 'ACTIVE',
  cancelledAt: null,
  createdAt: '2026-09-25T08:00:00-04:00',
};

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { wrapper, client };
}

beforeEach(() => {
  rescheduleMock.mockReset();
  vi.clearAllMocks();
});

describe('useRescheduleAppointment', () => {
  it('reprograms an appointment and invalidates affected data on success', async () => {
    rescheduleMock.mockResolvedValue(appointment);
    const { wrapper, client } = createWrapper();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRescheduleAppointment(), { wrapper });

    result.current.mutate({
      id: appointment.id,
      dto: { startTime: appointment.startTime },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(rescheduleMock).toHaveBeenCalledWith(appointment.id, {
      startTime: appointment.startTime,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['appointments'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['availability'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['metrics'] });
  });

  it('refreshes availability after SLOT_TAKEN', async () => {
    rescheduleMock.mockRejectedValue(
      new ApiRequestError(409, 'SLOT_TAKEN', 'El horario ya está ocupado', []),
    );
    const { wrapper, client } = createWrapper();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRescheduleAppointment(), { wrapper });

    result.current.mutate({
      id: appointment.id,
      dto: { startTime: appointment.startTime },
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['availability'] });
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['appointments'] });
  });

  it('refreshes agenda and metrics when the appointment is no longer active', async () => {
    rescheduleMock.mockRejectedValue(
      new ApiRequestError(404, 'NOT_FOUND', 'La cita no existe', []),
    );
    const { wrapper, client } = createWrapper();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useRescheduleAppointment(), { wrapper });

    result.current.mutate({
      id: appointment.id,
      dto: { startTime: appointment.startTime },
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['appointments'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['availability'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['metrics'] });
  });
});
