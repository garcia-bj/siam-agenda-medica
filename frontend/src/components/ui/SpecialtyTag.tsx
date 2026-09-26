import type { Specialty } from '@/types/api';

const COLORS: Record<Specialty, { bg: string; text: string; label: string }> = {
  MEDICINA_GENERAL: { bg: '#EAF0FA', text: '#2B4A7E', label: 'Medicina General' },
  PEDIATRIA:        { bg: '#E0F7F3', text: '#115E59', label: 'Pediatría' },
  CARDIOLOGIA:      { bg: '#FBEAE4', text: '#9A3412', label: 'Cardiología' },
  DERMATOLOGIA:     { bg: '#F2ECF8', text: '#633A86', label: 'Dermatología' },
};

export default function SpecialtyTag({ specialty }: { specialty: Specialty }) {
  const c = COLORS[specialty];
  return (
    <span
      className="specialty-tag"
      style={{ background: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  );
}
