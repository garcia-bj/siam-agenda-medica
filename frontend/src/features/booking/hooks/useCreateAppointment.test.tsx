import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppointment } from '@/lib/api/appointments';
import type { Appointment } from '@/types/api';
import { useCreateAppointment } from './useCreateAppointment';

vi.mock('@/lib/api/appointments', () => ({ createAppointment: vi.fn() }));
const createMock = vi.mocked(createAppointment);

const appointment: Appointment = {
  id: 'test-id',
  patientName: 'Test',
  patientEmail: 'test@test.com',
  specialty: 'PEDIATRIA',
  startTime: '2026-10-01T09:00:00-04:00',
  endTime: '2026-10-01T09:30:00-04:00',
  status: 'ACTIVE',
  cancelledAt: null,
  createdAt: new Date().toISOString(),
};

function createWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // Pre-populate caches so we can verify invalidation
  client.setQueryData(['availability', '2026-10-01', 'PEDIATRIA'], { date: '2026-10-01', isBusinessDay: true, slots: [] });
  client.setQueryData(['appointments'], { data: [] });
  client.setQueryData(['metrics'], {});
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { wrapper, client };
}

beforeEach(() => {
  createMock.mockReset();
});

describe('useCreateAppointment', () => {
  it('llama a createAppointment con el DTO y devuelve la cita', async () => {
    createMock.mockResolvedValue(appointment);
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateAppointment(), { wrapper });

    result.current.mutate({
      patientName: 'Test',
      patientEmail: 'test@test.com',
      specialty: 'PEDIATRIA',
      startTime: '2026-10-01T09:00:00-04:00',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(appointment);
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('invalida availability, appointments y metrics al tener éxito', async () => {
    createMock.mockResolvedValue(appointment);
    const { wrapper, client } = createWrapper();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useCreateAppointment(), { wrapper });

    result.current.mutate({
      patientName: 'Test',
      patientEmail: 'test@test.com',
      specialty: 'PEDIATRIA',
      startTime: '2026-10-01T09:00:00-04:00',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['availability'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['appointments'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['metrics'] });
  });

  it('expone el error de la API cuando falla', async () => {
    createMock.mockRejectedValue(new Error('Network error'));
    const { wrapper } = createWrapper();

    const { result } = renderHook(() => useCreateAppointment(), { wrapper });

    result.current.mutate({
      patientName: 'Test',
      patientEmail: 'test@test.com',
      specialty: 'PEDIATRIA',
      startTime: '2026-10-01T09:00:00-04:00',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network error');
  });
});
