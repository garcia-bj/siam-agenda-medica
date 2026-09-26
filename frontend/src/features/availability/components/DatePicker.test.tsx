import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DatePicker from './DatePicker';

// Hoy: lunes 28 de septiembre de 2026
const renderPicker = (onChange = vi.fn()) => {
  render(<DatePicker value="2026-09-29" today="2026-09-28" onChange={onChange} />);
  return onChange;
};
const day = (label: string) => screen.getByRole('button', { name: new RegExp(`^${label}`) });

describe('DatePicker', () => {
  it('muestra el mes del valor elegido', () => {
    renderPicker();
    expect(screen.getByText('Septiembre 2026')).toBeInTheDocument();
  });

  it('deshabilita los días pasados', () => {
    renderPicker();
    expect(day('Viernes 25 de septiembre')).toBeDisabled();
    expect(day('Viernes 25 de septiembre')).toHaveAccessibleName('Viernes 25 de septiembre, no disponible');
  });

  it('deshabilita los fines de semana futuros y habilita los días hábiles', () => {
    renderPicker();
    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));

    expect(day('Viernes 9 de octubre')).toBeEnabled();
    expect(day('Sábado 10 de octubre')).toBeDisabled();
    expect(day('Domingo 11 de octubre')).toBeDisabled();
  });

  it('marca hoy y el día elegido', () => {
    renderPicker();
    expect(day('Lunes 28 de septiembre')).toHaveAttribute('aria-current', 'date');
    expect(day('Martes 29 de septiembre')).toHaveAttribute('aria-pressed', 'true');
    expect(day('Lunes 28 de septiembre')).toHaveAttribute('aria-pressed', 'false');
  });

  it('avisa el día elegido al hacer clic en uno hábil', () => {
    const onChange = renderPicker();
    fireEvent.click(day('Miércoles 30 de septiembre'));
    expect(onChange).toHaveBeenCalledWith('2026-09-30');
  });

  it('navega entre meses, pero no a meses anteriores al de hoy', () => {
    renderPicker();
    expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));

    expect(screen.getByText('Octubre 2026')).toBeInTheDocument();
    expect(day('Lunes 5 de octubre')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Mes anterior' })).toBeEnabled();
  });
});
