import { SPECIALTIES, type Specialty } from '@/types/api';

export const SPECIALTY_LABELS: Record<Specialty, string> = {
  MEDICINA_GENERAL: 'Medicina General',
  PEDIATRIA: 'Pediatría',
  CARDIOLOGIA: 'Cardiología',
  DERMATOLOGIA: 'Dermatología',
};

interface SpecialtyPillsProps {
  value: Specialty;
  onChange: (specialty: Specialty) => void;
}

export default function SpecialtyPills({ value, onChange }: SpecialtyPillsProps) {
  return (
    <div role="group" aria-label="Especialidad" className="flex flex-wrap items-center gap-2">
      {SPECIALTIES.map((specialty) => {
        const active = specialty === value;
        return (
          <button
            key={specialty}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(specialty)}
            className={`h-11 rounded-full border px-4 text-[15px] transition-colors ${
              active
                ? 'border-ink bg-ink font-semibold text-white'
                : 'border-line bg-surface font-medium text-ink hover:border-primary'
            }`}
          >
            {SPECIALTY_LABELS[specialty]}
          </button>
        );
      })}
    </div>
  );
}
