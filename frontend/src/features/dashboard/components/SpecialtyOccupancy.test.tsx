import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SpecialtyOccupancy from './SpecialtyOccupancy';

const row = (specialty: 'PEDIATRIA' | 'CARDIOLOGIA', active: number, cancelled: number) => ({
  specialty,
  active,
  cancelled,
  capacity: 90,
  occupancyRate: active / 90,
});

describe('SpecialtyOccupancy', () => {
  it('habla del rango elegido, no de "la semana"', () => {
    render(<SpecialtyOccupancy data={[row('PEDIATRIA', 3, 1)]} slotsPerDay={396} />);

    expect(screen.getByText('Citas activas sobre 396 horarios disponibles en el rango')).toBeInTheDocument();
  });

  it('usa singular con 1 y plural con el resto', () => {
    const { container } = render(
      <SpecialtyOccupancy data={[row('PEDIATRIA', 1, 1), row('CARDIOLOGIA', 4, 0)]} slotsPerDay={90} />,
    );
    const text = container.textContent ?? '';

    expect(text).toContain('1 activa ·');
    expect(text).toContain('1 cancelada');
    expect(text).not.toContain('1 canceladas');
    expect(text).toContain('4 activas ·');
    expect(text).toContain('0 canceladas');
  });
});
