import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SpecialtyPills from './SpecialtyPills';

describe('SpecialtyPills', () => {
  it('muestra las 4 especialidades y marca la activa', () => {
    render(<SpecialtyPills value="PEDIATRIA" onChange={vi.fn()} />);

    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Medicina General',
      'Pediatría',
      'Cardiología',
      'Dermatología',
    ]);
    expect(screen.getByRole('button', { name: 'Pediatría' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('avisa la especialidad elegida', () => {
    const onChange = vi.fn();
    render(<SpecialtyPills value="PEDIATRIA" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cardiología' }));
    expect(onChange).toHaveBeenCalledWith('CARDIOLOGIA');
  });
});
