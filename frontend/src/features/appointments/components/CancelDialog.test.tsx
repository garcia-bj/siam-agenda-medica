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

  const res = render(
    <CancelDialog
      appointment={mockAppt}
      open={true}
      onClose={onClose}
      {...props}
    />,
    { wrapper },
  );

  return { onClose, container: res.container };
}

describe('CancelDialog', () => {
  beforeEach(() => {
    cancelMock.mockReset();
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    });
  });

  it('renders null when appointment is null', () => {
    const { container } = renderDialog({ appointment: null });
    expect(container.firstChild).toBeNull();
  });

  it('renders summary of appointment to cancel', () => {
    renderDialog();

    expect(screen.getAllByText('Cancelar cita').length).toBeGreaterThan(0);
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

    await waitFor(() => {
      expect(cancelMock).toHaveBeenCalledWith('appt-1');
    });
    expect(screen.getByRole('button', { name: 'Volver' })).toBeDisabled();

    resolveCancel();

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('disables confirm button while request is in-flight (double-click protection)', async () => {
    cancelMock.mockReturnValue(new Promise<void>(() => {})); // never resolves

    renderDialog();

    const confirmBtn = screen.getByRole('button', { name: 'Sí, cancelar cita' });
    fireEvent.click(confirmBtn);

    // After the first click the button must be disabled, preventing a second submit
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Cancelando/i })).toBeDisabled();
    });
  });

  it('calls onClose when Escape key closes the dialog', async () => {
    cancelMock.mockResolvedValue(undefined);
    const { onClose, container } = renderDialog();

    const dialog = container.querySelector('dialog')!;
    fireEvent(dialog, new Event('cancel'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
