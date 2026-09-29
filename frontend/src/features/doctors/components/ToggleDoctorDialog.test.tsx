import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateDoctor } from '@/lib/api/doctors';
import { ApiRequestError } from '@/lib/api/client';
import type { Doctor } from '@/types/api';
import ToggleDoctorDialog from './ToggleDoctorDialog';

vi.mock('@/lib/api/doctors', () => ({ updateDoctor: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));

const updateMock = vi.mocked(updateDoctor);

function doctor(overrides: Partial<Doctor>): Doctor {
  return {
    id: 'doc-1',
    name: 'Dra. Sofía Arce',
    specialty: 'PEDIATRIA',
    active: true,
    upcomingAppointments: 0,
    createdAt: '2026-09-25T08:00:00-04:00',
    updatedAt: '2026-09-25T08:00:00-04:00',
    ...overrides,
  };
}

function renderDialog(target: Doctor, doctors: Doctor[] = [target]) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const onClose = vi.fn();
  render(<ToggleDoctorDialog doctor={target} doctors={doctors} onClose={onClose} />, { wrapper });
  return { onClose, client };
}

beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
});

describe('ToggleDoctorDialog', () => {
  it('does not offer to deactivate a doctor with upcoming appointments', () => {
    renderDialog(doctor({ upcomingAppointments: 2 }));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Dra. Sofía Arce tiene 2 citas próximas en Pediatría. Cancélalas primero desde Citas.',
    );
    expect(screen.queryByRole('button', { name: 'Sí, desactivar' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir a Citas' })).toHaveAttribute('href', '/citas');
  });

  it('deactivates after confirming and refreshes doctors and availability', async () => {
    updateMock.mockResolvedValue(doctor({ active: false }));
    const { onClose, client } = renderDialog(doctor({}));
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    expect(screen.getByText(/Pediatría quedará sin médico activo/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sí, desactivar' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(updateMock).toHaveBeenCalledWith('doc-1', { active: false });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['doctors'] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['availability'] });
  });

  it('does not offer to reactivate when the specialty already has another active doctor', () => {
    const inactive = doctor({ id: 'doc-2', name: 'Dr. Andrés Paredes', active: false });
    renderDialog(inactive, [inactive, doctor({})]);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Pediatría ya tiene un médico activo (Dra. Sofía Arce). Desactívalo antes de reactivar a Dr. Andrés Paredes.',
    );
    expect(screen.queryByRole('button', { name: 'Sí, reactivar' })).not.toBeInTheDocument();
  });

  it('shows the server reason when an appointment was booked meanwhile (409)', async () => {
    updateMock.mockRejectedValue(
      new ApiRequestError(409, 'DOCTOR_HAS_APPOINTMENTS', 'Dra. Sofía Arce tiene 1 cita próxima', []),
    );
    const { onClose } = renderDialog(doctor({}));

    fireEvent.click(screen.getByRole('button', { name: 'Sí, desactivar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Dra. Sofía Arce tiene 1 cita próxima');
    expect(screen.getByRole('dialog', { name: 'No se puede desactivar' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
