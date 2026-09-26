import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAvailability } from '@/lib/api/availability';
import type { AvailabilityResponse, Slot } from '@/types/api';
import SlotGrid from './SlotGrid';

// El test no usa red ni mocks de la API: reemplaza fetchAvailability por una función controlada.
vi.mock('@/lib/api/availability', () => ({ fetchAvailability: vi.fn() }));
const fetchMock = vi.mocked(fetchAvailability);

const slot = (time: string, available: boolean): Slot => ({
  specialty: 'PEDIATRIA',
  startTime: `2026-10-01T${time}:00-04:00`,
  endTime: `2026-10-01T${time}:30:00-04:00`,
  available,
});
const day = (slots: Slot[], isBusinessDay = true): AvailabilityResponse => ({ date: '2026-10-01', isBusinessDay, slots });

function renderGrid(props: Partial<Parameters<typeof SlotGrid>[0]> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const onSelect = vi.fn();
  render(<SlotGrid date="2026-10-01" specialty="PEDIATRIA" onSelect={onSelect} {...props} />, { wrapper });
  return onSelect;
}

beforeEach(() => {
  fetchMock.mockReset();
});

describe('SlotGrid', () => {
  it('muestra un loader mientras carga', () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    renderGrid();
    expect(screen.getByRole('status', { name: 'Cargando horarios' })).toBeInTheDocument();
  });

  it('pide la disponibilidad del día y la especialidad', async () => {
    fetchMock.mockResolvedValue(day([slot('09', true)]));
    renderGrid();
    await screen.findByRole('button', { name: '09:00, libre' });
    expect(fetchMock).toHaveBeenCalledWith({ date: '2026-10-01', specialty: 'PEDIATRIA' });
  });

  it('muestra libres y ocupados, y cuenta los libres', async () => {
    fetchMock.mockResolvedValue(day([slot('09', true), slot('10', false), slot('11', true)]));
    renderGrid();

    expect(await screen.findByText('2 libres')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '09:00, libre' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '10:00, ocupado' })).toBeDisabled();
  });

  it('solo avisa al elegir un slot libre', async () => {
    const free = slot('09', true);
    fetchMock.mockResolvedValue(day([free, slot('10', false)]));
    const onSelect = renderGrid();

    fireEvent.click(await screen.findByRole('button', { name: '09:00, libre' }));
    fireEvent.click(screen.getByRole('button', { name: '10:00, ocupado' }));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(free);
  });

  it('marca el slot elegido y la cita actual al reprogramar', async () => {
    fetchMock.mockResolvedValue(day([slot('09', true), slot('10', false), slot('11', true)]));
    renderGrid({ selected: slot('11', true).startTime, currentSlot: slot('10', false).startTime, columns: 6 });

    expect(await screen.findByRole('button', { name: '11:00, elegido' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '10:00, actual' })).toBeDisabled();
  });

  it('en fin de semana avisa que no se atiende', async () => {
    fetchMock.mockResolvedValue(day([], false));
    renderGrid();
    expect(await screen.findByText('No atendemos este día')).toBeInTheDocument();
  });

  it('avisa cuando no quedan libres', async () => {
    fetchMock.mockResolvedValue(day([slot('09', false)]));
    renderGrid();
    expect(await screen.findByText('No quedan horarios libres')).toBeInTheDocument();
  });

  it('ante un error muestra "Reintentar" y vuelve a pedir los datos', async () => {
    fetchMock.mockRejectedValueOnce(new Error('sin red')).mockResolvedValue(day([slot('09', true)]));
    renderGrid();

    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('button', { name: '09:00, libre' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
