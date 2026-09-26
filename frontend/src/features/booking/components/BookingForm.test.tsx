import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAppointment } from '@/lib/api/appointments';
import { ApiRequestError } from '@/lib/api/client';
import type { Appointment, Slot, Specialty } from '@/types/api';
import BookingForm from './BookingForm';

vi.mock('@/lib/api/appointments', () => ({ createAppointment: vi.fn() }));
const createMock = vi.mocked(createAppointment);

const slot: Slot = {
  specialty: 'PEDIATRIA',
  startTime: '2026-10-01T09:00:00-04:00',
  endTime: '2026-10-01T09:30:00-04:00',
  available: true,
};

const appointment: Appointment = {
  id: 'abc-123',
  patientName: 'Ana Torres',
  patientEmail: 'ana@correo.com',
  specialty: 'PEDIATRIA',
  startTime: slot.startTime,
  endTime: slot.endTime,
  status: 'ACTIVE',
  cancelledAt: null,
  createdAt: new Date().toISOString(),
};

function renderForm(props: Partial<{ slot: Slot; specialty: Specialty; onBooked: () => void }> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const onBooked = props.onBooked ?? vi.fn();
  render(
    <BookingForm slot={props.slot ?? slot} specialty={props.specialty ?? 'PEDIATRIA'} onBooked={onBooked} />,
    { wrapper },
  );
  return onBooked;
}

function fillForm(name: string, email: string) {
  fireEvent.change(screen.getByLabelText('Nombre del paciente'), { target: { value: name } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
}

beforeEach(() => {
  createMock.mockReset();
});

describe('BookingForm', () => {
  it('renderiza los campos del formulario y el botón de enviar', () => {
    renderForm();
    expect(screen.getByLabelText('Nombre del paciente')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmar cita' })).toBeInTheDocument();
  });

  it('muestra errores de validación al enviar vacío', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cita' }));

    expect(await screen.findByText('El nombre debe tener al menos 2 caracteres')).toBeInTheDocument();
    expect(screen.getByText('El email es obligatorio')).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('muestra error si el email es inválido', async () => {
    renderForm();
    fillForm('Ana Torres', 'no-es-email');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cita' }));

    expect(await screen.findByText('Ingresa un email válido')).toBeInTheDocument();
  });

  it('envía la cita y llama onBooked al tener éxito', async () => {
    createMock.mockResolvedValue(appointment);
    const onBooked = renderForm();

    fillForm('Ana Torres', 'ana@correo.com');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cita' }));

    await waitFor(() => expect(onBooked).toHaveBeenCalledTimes(1));
    expect(createMock).toHaveBeenCalledWith({
      patientName: 'Ana Torres',
      patientEmail: 'ana@correo.com',
      specialty: 'PEDIATRIA',
      startTime: slot.startTime,
    });
  });

  it('muestra el error SLOT_TAKEN de la API', async () => {
    createMock.mockRejectedValue(
      new ApiRequestError(409, 'SLOT_TAKEN', 'El horario ya está ocupado para Pediatría', []),
    );
    renderForm();

    fillForm('Ana Torres', 'ana@correo.com');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cita' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El horario ya está ocupado para Pediatría');
  });

  it('muestra el error OUTSIDE_BUSINESS_HOURS', async () => {
    createMock.mockRejectedValue(
      new ApiRequestError(422, 'OUTSIDE_BUSINESS_HOURS', 'Fuera del horario de atención', []),
    );
    renderForm();

    fillForm('Ana Torres', 'ana@correo.com');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cita' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Fuera del horario de atención');
  });

  it('mapea errores de campo del backend a los campos del formulario', async () => {
    createMock.mockRejectedValue(
      new ApiRequestError(400, 'VALIDATION_ERROR', 'Error de validación', [
        { field: 'patientEmail', message: 'El email ya está registrado en esta franja' },
      ]),
    );
    renderForm();

    fillForm('Ana Torres', 'ana@correo.com');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cita' }));

    expect(await screen.findByText('El email ya está registrado en esta franja')).toBeInTheDocument();
  });

  it('desactiva el botón mientras envía y muestra "Reservando…"', async () => {
    createMock.mockReturnValue(new Promise(() => {})); // never resolves
    renderForm();

    fillForm('Ana Torres', 'ana@correo.com');
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar cita' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reservando/ })).toBeDisabled();
    });
  });
});
