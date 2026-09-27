import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAvailability } from '@/lib/api/availability';
import { rescheduleAppointment } from '@/lib/api/appointments';
import { ApiRequestError } from '@/lib/api/client';
import { firstBookableDay } from '@/features/availability/dates';
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

  return { onClose, container: res.container };
}

describe('RescheduleDialog', () => {
  beforeEach(() => {
    fetchAvailabilityMock.mockReset();
    rescheduleMock.mockReset();
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
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

    // Modal renders an sr-only <h2> with the same title; use getAllByText to avoid strict single-match
    expect(screen.getAllByText('Reprogramar cita').length).toBeGreaterThan(0);
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

    await waitFor(() => {
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

  it('shows error banner when API returns 409 SLOT_TAKEN', async () => {
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
    });
    expect(screen.getByText(/Ese horario se acaba de ocupar/)).toBeInTheDocument();
  });
});
