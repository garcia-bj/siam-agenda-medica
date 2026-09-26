import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  wide?: boolean;
  children?: ReactNode;
}

export default function Button({
  variant = 'primary',
  wide = false,
  className = '',
  type = 'button',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`btn btn--${variant}${wide ? ' btn--wide' : ''} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
