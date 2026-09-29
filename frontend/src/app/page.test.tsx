import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import type { Slot } from '@/types/api';
import HomePage from './page';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const SLOT: Slot = {
  specialty: 'PEDIATRIA',
  doctor: { id: 'd1', name: 'Dra. Sofía Arce' },
  startTime: '2030-06-17T10:00:00-04:00',
  endTime: '2030-06-17T10:30:00-04:00',
  available: true,
};

// La grilla y el formulario tienen sus propios tests; aquí solo importa cómo los conecta la página.
vi.mock('@/features/availability/components/SlotGrid', () => ({
  default: ({ onSelect }: { onSelect: (s: Slot) => void }) => (
    <button type="button" onClick={() => onSelect(SLOT)}>elegir 10:00</button>
  ),
}));
vi.mock('@/features/booking/components/BookingForm', () => ({
  default: ({ onBooked, onSlotTaken }: { onBooked: () => void; onSlotTaken: () => void }) => (
    <>
      <button type="button" onClick={onBooked}>simular 201</button>
      <button type="button" onClick={onSlotTaken}>simular 409</button>
    </>
  ),
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
});

function chooseSlot() {
  render(<HomePage />);
  fireEvent.click(screen.getByRole('button', { name: 'Pediatría' }));
  fireEvent.click(screen.getByRole('button', { name: 'elegir 10:00' }));
}

describe('HomePage', () => {
  it('el resumen muestra especialidad, día y hora', () => {
    chooseSlot();
    expect(screen.getByText(/^Pediatría · .+ · 10:00 – 10:30$/)).toBeInTheDocument();
  });

  it('la cita confirmada avisa con especialidad y hora, y ofrece ir a Citas', () => {
    chooseSlot();
    fireEvent.click(screen.getByRole('button', { name: 'simular 201' }));

    expect(toast.success).toHaveBeenCalledWith(
      'Cita confirmada',
      expect.objectContaining({
        description: expect.stringMatching(/^Pediatría · .+ · 10:00 – 10:30$/),
        action: expect.objectContaining({ label: 'Ver en Citas' }),
        duration: 5000,
      }),
    );
    expect(screen.getByText('Elige un horario disponible')).toBeInTheDocument();
  });

  it('el 409 explica qué horario se perdió y que la grilla ya se actualizó', () => {
    chooseSlot();
    fireEvent.click(screen.getByRole('button', { name: 'simular 409' }));

    expect(toast.error).toHaveBeenCalledWith(
      'Ese horario acaba de ser tomado',
      expect.objectContaining({
        description: expect.stringMatching(
          /^Pediatría, .+ a las 10:00 ya no está libre\. Ya actualizamos la disponibilidad: elige otro horario\.$/,
        ),
      }),
    );
    expect(screen.getByText('Elige un horario disponible')).toBeInTheDocument();
  });
});
