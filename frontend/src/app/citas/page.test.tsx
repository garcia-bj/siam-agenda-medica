import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CitasPage from './page';

const useAppointments = vi.fn();
vi.mock('@/features/appointments/hooks/useAppointments', () => ({
  useAppointments: (...args: unknown[]) => useAppointments(...args),
}));
vi.mock('@/features/appointments/components/CancelDialog', () => ({ default: () => null }));
vi.mock('@/features/appointments/components/RescheduleDialog', () => ({ default: () => null }));

const appointment = {
  id: '1', patientName: 'Ana Pérez', patientEmail: 'ana@correo.com', specialty: 'PEDIATRIA',
  startTime: '2026-09-28T10:30:00-04:00', endTime: '2026-09-28T11:00:00-04:00',
  status: 'ACTIVE', cancelledAt: null, createdAt: '2026-09-25T10:00:00-04:00',
};

describe('/citas', () => {
  beforeEach(() => useAppointments.mockReset());

  it('shows filtered count over total count', () => {
    useAppointments.mockImplementation((filters: { specialty?: string }) => ({
      data: { data: filters.specialty ? [appointment] : [appointment, { ...appointment, id: '2', patientName: 'Luis Pérez' }] },
      isLoading: false, isError: false,
    }));
    render(<CitasPage />);
    fireEvent.change(screen.getByLabelText('Especialidad'), { target: { value: 'PEDIATRIA' } });
    expect(screen.getByText(/Mostrando/)).toHaveTextContent('Mostrando 1 de 2 citas');
  });

  it('clears filters and shows the empty state', () => {
    useAppointments.mockReturnValue({ data: { data: [] }, isLoading: false, isError: false });
    render(<CitasPage />);
    expect(screen.getByText('No hay citas para mostrar')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Especialidad'), { target: { value: 'PEDIATRIA' } });
    expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeInTheDocument();
  });
});
