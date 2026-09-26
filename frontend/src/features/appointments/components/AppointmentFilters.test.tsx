import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppointmentFilters from './AppointmentFilters';

describe('AppointmentFilters', () => {
  it('changes specialty and date filters', () => {
    const onChange = vi.fn();
    render(<AppointmentFilters value={{}} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Especialidad'), { target: { value: 'PEDIATRIA' } });
    expect(onChange).toHaveBeenCalledWith({ specialty: 'PEDIATRIA', date: undefined });
    fireEvent.change(screen.getByLabelText('Fecha'), { target: { value: '2026-09-28' } });
    expect(onChange).toHaveBeenLastCalledWith({ date: '2026-09-28' });
  });

  it('clears filters', () => {
    const onChange = vi.fn();
    render(<AppointmentFilters value={{ specialty: 'PEDIATRIA', date: '2026-09-28' }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(onChange).toHaveBeenCalledWith({});
  });
});
