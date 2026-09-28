import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import KpiCard from './KpiCard';

describe('KpiCard', () => {
  it('renders icon, label, and value', () => {
    render(
      <KpiCard
        icon={<span data-testid="icon">📅</span>}
        label="CITAS ACTIVAS"
        value={86}
        subtitle="17.2 por día hábil"
      />,
    );

    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('CITAS ACTIVAS')).toBeInTheDocument();
    expect(screen.getByText('86')).toBeInTheDocument();
    expect(screen.getByText('17.2 por día hábil')).toBeInTheDocument();
  });

  it('applies highlight class when variant is "highlight"', () => {
    const { container } = render(
      <KpiCard
        icon={<span>📅</span>}
        label="CITAS ACTIVAS"
        value={86}
        variant="highlight"
      />,
    );

    const card = container.querySelector('.kpi-card');
    expect(card).toHaveClass('kpi-card--highlight');
  });

  it('does not apply highlight class by default', () => {
    const { container } = render(
      <KpiCard
        icon={<span>📅</span>}
        label="OCUPACIÓN"
        value="23.9 %"
      />,
    );

    const card = container.querySelector('.kpi-card');
    expect(card).not.toHaveClass('kpi-card--highlight');
  });
});
