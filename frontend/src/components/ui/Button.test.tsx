import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Button from './Button';

describe('Button', () => {
  it('renders primary button by default', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('btn--primary');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('renders secondary wide button', () => {
    render(<Button variant="secondary" wide>Secondary</Button>);
    const button = screen.getByRole('button', { name: 'Secondary' });
    expect(button).toHaveClass('btn--secondary', 'btn--wide');
  });
});
