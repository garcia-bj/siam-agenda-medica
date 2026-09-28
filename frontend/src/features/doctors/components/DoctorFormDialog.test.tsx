import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDoctor, updateDoctor } from '@/lib/api/doctors';
import { ApiRequestError } from '@/lib/api/client';
import type { Doctor } from '@/types/api';
import DoctorFormDialog from './DoctorFormDialog';

vi.mock('@/lib/api/doctors', () => ({ createDoctor: vi.fn(), updateDoctor: vi.fn() }));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));

const createMock = vi.mocked(createDoctor);
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

// Pediatría ocupada; Dermatología sin médico activo.
const DOCTORS = [
  doctor({}),
  doctor({ id: 'doc-2', name: 'Dra. Camila Vega', specialty: 'DERMATOLOGIA', active: false }),
];

function renderDialog(editing: Doctor | null = null) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const onClose = vi.fn();
  render(<DoctorFormDialog doctor={editing} doctors={DOCTORS} onClose={onClose} />, { wrapper });
  return { onClose };
}

const nameInput = () => screen.getByLabelText('Nombre completo');
const specialtySelect = () => screen.getByLabelText('Especialidad');
const submit = () => screen.getByRole('button', { name: 'Registrar médico' });

beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
});

describe('DoctorFormDialog', () => {
  it('validates name and specialty without calling the API', async () => {
    renderDialog();
    fireEvent.click(submit());

    expect(await screen.findByText('El nombre debe tener al menos 2 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Elige una especialidad', { selector: '.field__error' })).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('warns and blocks saving when the specialty already has an active doctor', () => {
    renderDialog();
    fireEvent.change(specialtySelect(), { target: { value: 'PEDIATRIA' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Pediatría ya tiene un médico activo (Dra. Sofía Arce)');
    expect(submit()).toBeDisabled();
  });

  it('registers a doctor in a free specialty and closes', async () => {
    createMock.mockResolvedValue(doctor({ id: 'doc-3', name: 'Dra. Laura Méndez', specialty: 'DERMATOLOGIA' }));
    const { onClose } = renderDialog();

    fireEvent.change(nameInput(), { target: { value: '  Dra. Laura Méndez ' } });
    fireEvent.change(specialtySelect(), { target: { value: 'DERMATOLOGIA' } });
    fireEvent.click(submit());

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledWith({ name: 'Dra. Laura Méndez', specialty: 'DERMATOLOGIA' });
  });

  it('shows the server message when the specialty was taken meanwhile (409)', async () => {
    createMock.mockRejectedValue(
      new ApiRequestError(409, 'SPECIALTY_HAS_DOCTOR', 'Dermatología ya tiene un médico activo (Dr. X)', []),
    );
    const { onClose } = renderDialog();

    fireEvent.change(nameInput(), { target: { value: 'Dra. Laura Méndez' } });
    fireEvent.change(specialtySelect(), { target: { value: 'DERMATOLOGIA' } });
    fireEvent.click(submit());

    expect(await screen.findByRole('alert')).toHaveTextContent('Dermatología ya tiene un médico activo (Dr. X)');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('edits only the name; the specialty is read-only', async () => {
    updateMock.mockResolvedValue(doctor({ name: 'Dra. Sofía Arce Rojas' }));
    const { onClose } = renderDialog(DOCTORS[0]);

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    fireEvent.change(nameInput(), { target: { value: 'Dra. Sofía Arce Rojas' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(updateMock).toHaveBeenCalledWith('doc-1', { name: 'Dra. Sofía Arce Rojas' });
  });
});
