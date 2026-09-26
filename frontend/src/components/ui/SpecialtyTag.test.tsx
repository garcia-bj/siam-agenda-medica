import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SpecialtyTag from './SpecialtyTag';

describe('SpecialtyTag', () => {
  it('renders Pediatría with correct text', () => {
    render(<SpecialtyTag specialty="PEDIATRIA" />);
    const tag = screen.getByText('Pediatría');
    expect(tag).toBeInTheDocument();
    expect(tag).toHaveClass('specialty-tag');
  });

  it('renders Medicina General', () => {
    render(<SpecialtyTag specialty="MEDICINA_GENERAL" />);
    const tag = screen.getByText('Medicina General');
    expect(tag).toBeInTheDocument();
  });
});
