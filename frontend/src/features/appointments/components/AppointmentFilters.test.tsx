import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AppointmentFilters from './AppointmentFilters';

describe('AppointmentFilters', () => {
  it('renders filter controls and shows counter "Mostrando N de M citas"', () => {
    render(
      <AppointmentFilters
        filters={{}}
        onFilterChange={vi.fn()}
        onClearFilters={vi.fn()}
        filteredCount={5}
        totalCount={10}
      />,
    );

    expect(screen.getByLabelText('Especialidad')).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha')).toBeInTheDocument();
    expect(screen.getByText(/Mostrando/)).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument();
  });

  it('calls onFilterChange when specialty changes', () => {
    const onFilterChange = vi.fn();
    render(
      <AppointmentFilters
        filters={{}}
        onFilterChange={onFilterChange}
        onClearFilters={vi.fn()}
        filteredCount={5}
        totalCount={10}
      />,
    );

    fireEvent.change(screen.getByLabelText('Especialidad'), {
      target: { value: 'PEDIATRIA' },
    });

    expect(onFilterChange).toHaveBeenCalledWith({ specialty: 'PEDIATRIA' });
  });

  it('calls onFilterChange when date changes', () => {
    const onFilterChange = vi.fn();
    render(
      <AppointmentFilters
        filters={{}}
        onFilterChange={onFilterChange}
        onClearFilters={vi.fn()}
        filteredCount={5}
        totalCount={10}
      />,
    );

    fireEvent.change(screen.getByLabelText('Fecha'), {
      target: { value: '2026-09-28' },
    });

    expect(onFilterChange).toHaveBeenCalledWith({ date: '2026-09-28' });
  });

  it('shows "Limpiar filtros" button when filters are active and calls onClearFilters on click', () => {
    const onClearFilters = vi.fn();
    render(
      <AppointmentFilters
        filters={{ specialty: 'CARDIOLOGIA', date: '2026-09-28' }}
        onFilterChange={vi.fn()}
        onClearFilters={onClearFilters}
        filteredCount={2}
        totalCount={10}
      />,
    );

    const clearBtn = screen.getByRole('button', { name: 'Limpiar filtros' });
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });
});
