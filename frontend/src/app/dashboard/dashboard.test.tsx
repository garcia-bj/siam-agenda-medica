import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import DashboardPage from './page';
import { useMetrics } from '@/features/dashboard/hooks/useMetrics';

vi.mock('@/features/dashboard/hooks/useMetrics', () => ({
  useMetrics: vi.fn(),
}));

describe('DashboardPage', () => {
  it('renders exact subtitle for peak hour', () => {
    vi.mocked(useMetrics).mockReturnValue({
      data: {
        range: { from: '2026-09-28', to: '2026-10-02', businessDays: 5 },
        totals: { active: 10, cancelled: 0, capacity: 100, occupancyRate: 0.1, cancellationRate: 0 },
        bySpecialty: [],
        byDay: [],
        byHour: [
          { hour: '14:00', active: 5 }
        ],
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMetrics>);

    render(<DashboardPage />);
    
    expect(screen.getByText('5 citas entre 14:00 y 15:00')).toBeInTheDocument();
  });

  it('uses singular when the peak hour has a single appointment', () => {
    vi.mocked(useMetrics).mockReturnValue({
      data: {
        range: { from: '2026-09-28', to: '2026-10-02', businessDays: 5 },
        totals: { active: 1, cancelled: 0, capacity: 360, occupancyRate: 0.003, cancellationRate: 0 },
        bySpecialty: [],
        byDay: [],
        byHour: [{ hour: '09:00', active: 1 }],
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useMetrics>);

    render(<DashboardPage />);

    expect(screen.getByText('1 cita entre 09:00 y 10:00')).toBeInTheDocument();
  });
});
