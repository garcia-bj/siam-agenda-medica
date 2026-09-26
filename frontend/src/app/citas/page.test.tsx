import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAppointments } from '@/lib/api/appointments';
import type { Appointment } from '@/types/api';
import CitasPage from './page';

vi.mock('@/lib/api/appointments', () => ({
  fetchAppointments: vi.fn(),
}));

const fetchMock = vi.mocked(fetchAppointments);

const mockData: Appointment[] = [
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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return render(<CitasPage />, { wrapper });
}

describe('CitasPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('renders title and "Nueva cita" button leading to "/"', async () => {
    fetchMock.mockResolvedValue({ data: [] });
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Citas agendadas' })).toBeInTheDocument();
    const newApptBtn = screen.getByRole('link', { name: 'Nueva cita' });
    expect(newApptBtn).toBeInTheDocument();
    expect(newApptBtn.getAttribute('href')).toBe('/');
  });

  it('lists active appointments ordered by time with initials, patient name, email, specialty, date, and time', async () => {
    fetchMock.mockResolvedValue({ data: mockData });
    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('Carlos Méndez').length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText('Ana Ruiz').length).toBeGreaterThan(0);
    expect(screen.getAllByText('carlos@correo.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('ana@correo.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CM').length).toBeGreaterThan(0);
    expect(screen.getAllByText('AR').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Medicina General').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Pediatría').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Lun 28 sep 2026').length).toBeGreaterThan(0);
    expect(screen.getAllByText('10:30').length).toBeGreaterThan(0);
  });

  it('shows "Mostrando N de M citas" counter and filters by specialty', async () => {
    fetchMock.mockImplementation((query) => {
      if (query?.specialty === 'PEDIATRIA') {
        return Promise.resolve({ data: [mockData[1]] });
      }
      return Promise.resolve({ data: mockData });
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/Mostrando/).length).toBeGreaterThan(0);

    // Filter by Pediatria
    fireEvent.change(screen.getByLabelText('Especialidad'), {
      target: { value: 'PEDIATRIA' },
    });

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
    expect(screen.queryByText('Carlos Méndez')).not.toBeInTheDocument();
    expect(screen.getAllByText('Ana Ruiz').length).toBeGreaterThan(0);
  });

  it('resets filters when "Limpiar filtros" is clicked', async () => {
    fetchMock.mockImplementation((query) => {
      if (query?.specialty === 'PEDIATRIA') {
        return Promise.resolve({ data: [mockData[1]] });
      }
      return Promise.resolve({ data: mockData });
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getAllByText('Carlos Méndez').length).toBeGreaterThan(0);
    });

    // Apply filter
    fireEvent.change(screen.getByLabelText('Especialidad'), {
      target: { value: 'PEDIATRIA' },
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeInTheDocument();
    });

    // Click clear filters
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));

    await waitFor(() => {
      expect(screen.getAllByText('Carlos Méndez').length).toBeGreaterThan(0);
    });
  });

  it('renders empty state when no appointments exist', async () => {
    fetchMock.mockResolvedValue({ data: [] });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('No hay citas agendadas')).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'Agendar una cita' })).toBeInTheDocument();
  });
});
