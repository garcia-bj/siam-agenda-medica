import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Appointment } from '@/types/api';
import AppointmentList from './AppointmentList';

const mockAppointments: Appointment[] = [
  {
    id: 'appt-1',
    patientName: 'Carlos Méndez',
    patientEmail: 'carlos@correo.com',
    specialty: 'MEDICINA_GENERAL',
    startTime: '2026-09-28T10:30:00-04:00',
    endTime: '2026-09-28T11:00:00-04:00',
    status: 'ACTIVE',
    cancelledAt: null,
    createdAt: '2026-09-25T08:00:00-04:00',
  },
  {
    id: 'appt-2',
    patientName: 'Ana Ruiz',
    patientEmail: 'ana@correo.com',
    specialty: 'PEDIATRIA',
    startTime: '2026-09-28T11:30:00-04:00',
    endTime: '2026-09-28T12:00:00-04:00',
    status: 'ACTIVE',
    cancelledAt: null,
    createdAt: '2026-09-25T09:00:00-04:00',
  },
];

describe('AppointmentList', () => {
  it('renders loading state', () => {
    render(<AppointmentList appointments={[]} isLoading={true} />);
    expect(screen.getByText('Cargando citas...')).toBeInTheDocument();
  });

  it('renders error state with retry button', () => {
    const onRetry = vi.fn();
    render(
      <AppointmentList
        appointments={[]}
        isError={true}
        onRetry={onRetry}
      />,
    );

    expect(
      screen.getByText('Ocurrió un error al cargar la lista de citas.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('renders empty state with link to book an appointment when empty', () => {
    render(<AppointmentList appointments={[]} />);

    expect(screen.getByText('No hay citas agendadas')).toBeInTheDocument();
    const linkBtn = screen.getByRole('link', { name: 'Agendar una cita' });
    expect(linkBtn).toBeInTheDocument();
    expect(linkBtn.getAttribute('href')).toBe('/');
  });

  it('renders appointment list with initials, patient name, email, specialty, date, and time', () => {
    render(<AppointmentList appointments={mockAppointments} />);

    // Check patient names
    expect(screen.getAllByText('Carlos Méndez').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ana Ruiz').length).toBeGreaterThan(0);

    // Check emails
    expect(screen.getAllByText('carlos@correo.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ana@correo.com').length).toBeGreaterThan(0);

    // Check initials
    expect(screen.getAllByText('CM').length).toBeGreaterThan(0);
    expect(screen.getAllByText('AR').length).toBeGreaterThan(0);

    // Check formatted date and time
    expect(screen.getAllByText('Lun 28 sep 2026').length).toBeGreaterThan(0);
    expect(screen.getAllByText('10:30').length).toBeGreaterThan(0);
    expect(screen.getAllByText('11:30').length).toBeGreaterThan(0);
  });

  it('triggers onCancel and onReschedule handlers when buttons are clicked', () => {
    const onCancel = vi.fn();
    const onReschedule = vi.fn();

    render(
      <AppointmentList
        appointments={mockAppointments}
        onCancel={onCancel}
        onReschedule={onReschedule}
      />,
    );

    const cancelBtns = screen.getAllByRole('button', { name: 'Cancelar' });
    const rescheduleBtns = screen.getAllByRole('button', { name: 'Reprogramar' });

    expect(cancelBtns.length).toBeGreaterThan(0);
    expect(rescheduleBtns.length).toBeGreaterThan(0);

    fireEvent.click(cancelBtns[0]);
    expect(onCancel).toHaveBeenCalledWith(mockAppointments[0]);

    fireEvent.click(rescheduleBtns[0]);
    expect(onReschedule).toHaveBeenCalledWith(mockAppointments[0]);
  });
});
