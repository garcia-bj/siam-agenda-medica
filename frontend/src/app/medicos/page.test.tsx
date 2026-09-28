import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDoctors } from '@/lib/api/doctors';
import type { Doctor } from '@/types/api';
import MedicosPage from './page';

vi.mock('@/lib/api/doctors', () => ({ fetchDoctors: vi.fn() }));

const fetchMock = vi.mocked(fetchDoctors);

function doctor(overrides: Partial<Doctor>): Doctor {
  return {
    id: 'doc-1',
    name: 'Dr. Martín Gutiérrez',
    specialty: 'MEDICINA_GENERAL',
    active: true,
    upcomingAppointments: 2,
    createdAt: '2026-09-25T08:00:00-04:00',
    updatedAt: '2026-09-25T08:00:00-04:00',
    ...overrides,
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  render(<MedicosPage />, { wrapper });
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe('MedicosPage', () => {
  it('shows which specialties are left without an active doctor', async () => {
    fetchMock.mockResolvedValue({
      data: [
        doctor({}),
        doctor({ id: 'doc-2', name: 'Dra. Camila Vega', specialty: 'DERMATOLOGIA', active: false, upcomingAppointments: 0 }),
      ],
    });
    renderPage();

    const coverage = await screen.findByRole('region', { name: 'Cobertura por especialidad' });
    // Pediatría, Cardiología y Dermatología no tienen médico activo.
    expect(coverage.textContent?.match(/Sin médico activo/g)).toHaveLength(3);
    expect(screen.getByText('1 activos · 1 inactivos')).toBeInTheDocument();
  });

  it('hides inactive doctors when the filter is unchecked', async () => {
    fetchMock.mockResolvedValue({
      data: [doctor({}), doctor({ id: 'doc-2', name: 'Dr. Andrés Paredes', active: false, upcomingAppointments: 0 })],
    });
    renderPage();

    expect((await screen.findAllByText('Dr. Andrés Paredes')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByLabelText('Mostrar inactivos'));
    expect(screen.queryByText('Dr. Andrés Paredes')).not.toBeInTheDocument();
  });

  it('offers a retry when loading fails', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    renderPage();

    expect(await screen.findByText('Ocurrió un error al cargar los médicos.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
