import { useId, type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: { value: string; label: string }[];
}

export default function Select({ label, options, id, ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  
  return (
    <div className="field">
      <label htmlFor={selectId} className="field__label">{label}</label>
      <select id={selectId} className="field__select" {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
