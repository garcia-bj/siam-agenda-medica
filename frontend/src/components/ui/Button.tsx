import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  wide?: boolean;
}

export default function Button({
  variant = 'primary',
  wide = false,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn btn--${variant}${wide ? ' btn--wide' : ''} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
