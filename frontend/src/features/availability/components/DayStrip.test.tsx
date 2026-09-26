import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DayStrip from './DayStrip';

describe('DayStrip', () => {
  it('muestra 5 días hábiles desde `from`, saltando el fin de semana', () => {
    // Jueves 1 de octubre de 2026
    render(<DayStrip value="2026-10-01" from="2026-10-01" onChange={vi.fn()} />);

    const labels = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'));
    expect(labels).toEqual([
      'Jueves 1 de octubre',
      'Viernes 2 de octubre',
      'Lunes 5 de octubre',
      'Martes 6 de octubre',
      'Miércoles 7 de octubre',
    ]);
  });

  it('marca el día elegido y avisa al cambiar', () => {
    const onChange = vi.fn();
    render(<DayStrip value="2026-10-02" from="2026-10-01" onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'Viernes 2 de octubre' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Lunes 5 de octubre' }));
    expect(onChange).toHaveBeenCalledWith('2026-10-05');
  });
});
