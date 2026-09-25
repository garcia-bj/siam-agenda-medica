import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export default function Input({ label, error, id, ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="field">
      <label htmlFor={inputId} className="field__label">{label}</label>
      <input
        id={inputId}
        className={`field__input${error ? ' field__input--error' : ''}`}
        {...props}
      />
      {error && <span className="field__error">{error}</span>}
    </div>
  );
}
