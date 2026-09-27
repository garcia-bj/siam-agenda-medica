import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAvailability } from '@/lib/api/availability';
import { rescheduleAppointment } from '@/lib/api/appointments';
import { ApiRequestError } from '@/lib/api/client';
import { addDays, firstBookableDay, formatDayLong } from '@/features/availability/dates';
import type { Appointment, AvailabilityResponse, Slot } from '@/types/api';
import RescheduleDialog from './RescheduleDialog';

vi.mock('@/lib/api/availability', () => ({
  fetchAvailability: vi.fn(),
}));

vi.mock('@/lib/api/appointments', () => ({
  rescheduleAppointment: vi.fn(),
}));

const fetchAvailabilityMock = vi.mocked(fetchAvailability);
const rescheduleMock = vi.mocked(rescheduleAppointment);

const testDate = firstBookableDay();

const mockAppt: Appointment = {
  id: 'appt-1',
  patientName: 'Carlos Méndez',
  patientEmail: 'carlos@correo.com',
  specialty: 'MEDICINA_GENERAL',
  startTime: `${testDate}T10:30:00-04:00`,
  endTime: `${testDate}T11:00:00-04:00`,
  status: 'ACTIVE',
  cancelledAt: null,
  createdAt: '2026-09-25T08:00:00-04:00',
};

const createSlot = (time: string, available: boolean): Slot => ({
  specialty: 'MEDICINA_GENERAL',
  startTime: `${testDate}T${time}:00-04:00`,
  endTime: `${testDate}T${time}:30-04:00`,
  available,
});

const availabilityData: AvailabilityResponse = {
  date: testDate,
  isBusinessDay: true,
  slots: [
    createSlot('10:30', false), // Current slot
    createSlot('11:30', true),  // Available slot
  ],
};

function renderDialog(props: Partial<Parameters<typeof RescheduleDialog>[0]> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const onClose = vi.fn();

  const res = render(
    <RescheduleDialog
      appointment={mockAppt}
      open={true}
      onClose={onClose}
      {...props}
    />,
    { wrapper },
  );

  return { onClose, container: res.container, queryClient };
}

describe('RescheduleDialog', () => {
  beforeEach(() => {
    fetchAvailabilityMock.mockReset();
    rescheduleMock.mockReset();
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
      this.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    });
    fetchAvailabilityMock.mockResolvedValue(availabilityData);
  });

  it('renders null when appointment is null', () => {
    const { container } = renderDialog({ appointment: null });
    expect(container.firstChild).toBeNull();
  });

  it('renders header summary with patient name and current schedule', async () => {
    renderDialog();

    expect(screen.getAllByRole('heading', { name: 'Reprogramar cita' })).toHaveLength(1);
    expect(screen.getByText('Carlos Méndez')).toBeInTheDocument();
    expect(screen.getByText(/Actual:/)).toBeInTheDocument();
  });

  it('allows selecting a slot and enables "Guardar cambio" button', async () => {
    renderDialog();

    const freeSlotBtn = await screen.findByRole('button', { name: '11:30, libre' });
    expect(freeSlotBtn).toBeInTheDocument();

    const saveBtn = screen.getByRole('button', { name: 'Guardar cambio' });
    expect(saveBtn).toBeDisabled();

    fireEvent.click(freeSlotBtn);

    expect(saveBtn).toBeEnabled();
    expect(screen.getByText(/Nueva cita:/)).toBeInTheDocument();
  });

  it('keeps the day strip anchored at the first bookable date after selecting a later day', async () => {
    renderDialog();

    const firstDate = screen.getByRole('button', { name: formatDayLong(testDate) });
    fireEvent.click(screen.getByRole('button', { name: formatDayLong(addDays(testDate, 2)) }));

    expect(firstDate).toBeInTheDocument();
    expect(firstDate).toHaveAttribute('aria-pressed', 'false');
  });

  it('submits reschedule request, disables button, and closes modal on success', async () => {
    rescheduleMock.mockResolvedValue({
      ...mockAppt,
      startTime: `${testDate}T11:30:00-04:00`,
    });

    const { onClose } = renderDialog();

    const freeSlotBtn = await screen.findByRole('button', { name: '11:30, libre' });
    fireEvent.click(freeSlotBtn);

    const saveBtn = screen.getByRole('button', { name: 'Guardar cambio' });
    fireEvent.click(saveBtn);
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(rescheduleMock).toHaveBeenCalledTimes(1);
      expect(rescheduleMock).toHaveBeenCalledWith('appt-1', {
        startTime: `${testDate}T11:30:00-04:00`,
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('disables save button while request is in-flight (double-click protection)', async () => {
    rescheduleMock.mockReturnValue(new Promise(() => {})); // never resolves

    renderDialog();

    const freeSlotBtn = await screen.findByRole('button', { name: '11:30, libre' });
    fireEvent.click(freeSlotBtn);

    const saveBtn = screen.getByRole('button', { name: 'Guardar cambio' });
    fireEvent.click(saveBtn);

    // After the first click the button must be disabled, preventing a second submit
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Guardando/i })).toBeDisabled();
    });
  });

  it('calls onClose when Escape key closes the dialog', async () => {
    rescheduleMock.mockResolvedValue(undefined as never);
    const { onClose, container } = renderDialog();

    const dialog = container.querySelector('dialog')!;
    fireEvent(dialog, new Event('cancel'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows the SLOT_TAKEN message and reloads availability', async () => {
    rescheduleMock.mockRejectedValue(
      new ApiRequestError(409, 'SLOT_TAKEN', 'El horario ya está ocupado', []),
    );

    renderDialog();

    const freeSlotBtn = await screen.findByRole('button', { name: '11:30, libre' });
    fireEvent.click(freeSlotBtn);

    const saveBtn = screen.getByRole('button', { name: 'Guardar cambio' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(fetchAvailabilityMock).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByText(/Ese horario se acaba de ocupar/)).toBeInTheDocument();
  });

  it.each([
    [409, 'ALREADY_CANCELLED'],
    [404, 'NOT_FOUND'],
  ])('closes and refreshes the agenda for %s %s', async (statusCode, code) => {
    rescheduleMock.mockRejectedValue(
      new ApiRequestError(statusCode, code, 'La cita ya no está disponible', []),
    );
    const { onClose, queryClient } = renderDialog();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    fireEvent.click(await screen.findByRole('button', { name: '11:30, libre' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambio' }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['appointments'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['metrics'] });
    });
  });
});
