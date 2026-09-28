import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DateRangeFilter from './DateRangeFilter';
import { currentWeekRange } from '../utils/dateRanges';

describe('DateRangeFilter', () => {
  const defaultProps = {
    range: currentWeekRange(),
    preset: 'week' as const,
    specialty: undefined,
    onRangeChange: vi.fn(),
    onSpecialtyChange: vi.fn(),
  };

  it('selects "Esta semana" and emits the week range', () => {
    const onRangeChange = vi.fn();
    render(<DateRangeFilter {...defaultProps} preset="month" onRangeChange={onRangeChange} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Esta semana' }));

    expect(onRangeChange).toHaveBeenCalledTimes(1);
    const [range, preset] = onRangeChange.mock.calls[0];
    expect(preset).toBe('week');
    expect(range.from).toBeDefined();
    expect(range.to).toBeDefined();
    // Week range should be Mon-Fri (5 days)
    const from = new Date(`${range.from}T12:00:00`);
    const to = new Date(`${range.to}T12:00:00`);
    const diff = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    expect(diff).toBe(4); // Mon to Fri = 4 days difference
  });

  it('selects "Este mes" and emits the month range', () => {
    const onRangeChange = vi.fn();
    render(<DateRangeFilter {...defaultProps} onRangeChange={onRangeChange} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Este mes' }));

    expect(onRangeChange).toHaveBeenCalledTimes(1);
    const [range, preset] = onRangeChange.mock.calls[0];
    expect(preset).toBe('month');
    // Month range starts on 1st
    expect(range.from).toMatch(/-01$/);
  });

  it('in custom mode, shows date inputs', () => {
    render(<DateRangeFilter {...defaultProps} preset="custom" />);

    expect(screen.getByLabelText('Desde')).toBeInTheDocument();
    expect(screen.getByLabelText('Hasta')).toBeInTheDocument();
  });

  it('does not show date inputs in week/month mode', () => {
    render(<DateRangeFilter {...defaultProps} preset="week" />);

    expect(screen.queryByLabelText('Desde')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Hasta')).not.toBeInTheDocument();
  });
});
