import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cancelAppointment } from '@/lib/api/appointments';
import type { Appointment } from '@/types/api';
import CancelDialog from './CancelDialog';

vi.mock('@/lib/api/appointments', () => ({
  cancelAppointment: vi.fn(),
}));

const cancelMock = vi.mocked(cancelAppointment);

const mockAppt: Appointment = {
  id: 'appt-1',
  patientName: 'Carlos Méndez',
  patientEmail: 'carlos@correo.com',
  specialty: 'MEDICINA_GENERAL',
  startTime: '2026-09-28T10:30:00-04:00',
  endTime: '2026-09-28T11:00:00-04:00',
  status: 'ACTIVE',
  cancelledAt: null,
  createdAt: '2026-09-25T08:00:00-04:00',
};

function renderDialog(props: Partial<Parameters<typeof CancelDialog>[0]> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const onClose = vi.fn();

  render(
    <CancelDialog
      appointment={mockAppt}
      open={true}
      onClose={onClose}
      {...props}
    />,
    { wrapper },
  );

  return { onClose };
}

describe('CancelDialog', () => {
  beforeEach(() => {
    cancelMock.mockReset();
    HTMLDialogElement.prototype.showModal = vi.fn();
    HTMLDialogElement.prototype.close = vi.fn();
  });

  it('renders null when appointment is null', () => {
    const { container } = render(<CancelDialog appointment={null} open={true} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders summary of appointment to cancel', () => {
    renderDialog();

    expect(screen.getByText('Cancelar cita')).toBeInTheDocument();
    expect(screen.getByText('Carlos Méndez')).toBeInTheDocument();
    expect(screen.getByText('carlos@correo.com')).toBeInTheDocument();
    expect(screen.getByText('Medicina General')).toBeInTheDocument();
    expect(screen.getByText('Lun 28 sep 2026 · 10:30 hs')).toBeInTheDocument();
  });

  it('calls onClose when "Volver" button is clicked', () => {
    const { onClose } = renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('confirms cancellation, calls API, disables button during loading, and closes on success', async () => {
    let resolveCancel: () => void = () => {};
    cancelMock.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveCancel = resolve;
      }),
    );

    const { onClose } = renderDialog();

    const confirmBtn = screen.getByRole('button', { name: 'Sí, cancelar cita' });
    fireEvent.click(confirmBtn);

    expect(cancelMock).toHaveBeenCalledWith('appt-1');
    expect(screen.getByRole('button', { name: 'Volver' })).toBeDisabled();

    resolveCancel();

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
