'use client';

import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { SPECIALTIES, type AppointmentsQuery, type Specialty } from '@/types/api';

const labels: Record<Specialty, string> = {
  MEDICINA_GENERAL: 'Medicina General',
  PEDIATRIA: 'Pediatría',
  CARDIOLOGIA: 'Cardiología',
  DERMATOLOGIA: 'Dermatología',
};

interface Props {
  value: AppointmentsQuery & { search?: string };
  onChange: (value: AppointmentsQuery & { search?: string }) => void;
}

export default function AppointmentFilters({ value, onChange }: Props) {
  const options = [
    { value: '', label: 'Todas las especialidades' },
    ...SPECIALTIES.map((specialty) => ({ value: specialty, label: labels[specialty] })),
  ];

  const hasFilters = Boolean(value.specialty || value.date || value.search);

  return (
    <div className="appointment-filters" aria-label="Filtros de citas">
      <Input
        label="Buscar"
        placeholder="Nombre del paciente o profesional..."
        value={value.search ?? ''}
        onChange={(e) => onChange({ ...value, search: e.target.value || undefined })}
      />
      <Select
        label="Especialidad"
        options={options}
        value={value.specialty ?? ''}
        onChange={(e) =>
          onChange({ ...value, specialty: (e.target.value || undefined) as Specialty | undefined })
        }
      />
      <Input
        label="Fecha"
        type="date"
        value={value.date ?? ''}
        onChange={(e) => onChange({ ...value, date: e.target.value || undefined })}
      />
      {hasFilters && (
        <Button
          variant="ghost"
          className="appointment-filters__clear"
          onClick={() => onChange({})}
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
