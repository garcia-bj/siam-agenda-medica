import type { Specialty } from '@/types/api';
import Select from '@/components/ui/Select';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import type { AppointmentFiltersState } from '../hooks/useAppointments';

const SPECIALTY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todas las especialidades' },
  { value: 'MEDICINA_GENERAL', label: 'Medicina General' },
  { value: 'PEDIATRIA', label: 'Pediatría' },
  { value: 'CARDIOLOGIA', label: 'Cardiología' },
  { value: 'DERMATOLOGIA', label: 'Dermatología' },
];

interface AppointmentFiltersProps {
  filters: AppointmentFiltersState;
  onFilterChange: (filters: AppointmentFiltersState) => void;
  onClearFilters: () => void;
  filteredCount: number;
  totalCount: number;
}

export default function AppointmentFilters({
  filters,
  onFilterChange,
  onClearFilters,
  filteredCount,
  totalCount,
}: AppointmentFiltersProps) {
  const hasActiveFilters = Boolean(filters.specialty || filters.date);

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="w-full sm:w-56">
          <Select
            label="Especialidad"
            value={filters.specialty || ''}
            options={SPECIALTY_OPTIONS}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                specialty: (e.target.value as Specialty) || '',
              })
            }
          />
        </div>

        <div className="w-full sm:w-44">
          <Input
            label="Fecha"
            type="date"
            value={filters.date || ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                date: e.target.value,
              })
            }
          />
        </div>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={onClearFilters}
            className="self-start sm:self-auto"
          >
            Limpiar filtros
          </Button>
        )}
      </div>

      <div className="text-sm font-medium text-muted">
        Mostrando <span className="font-semibold text-ink">{filteredCount}</span> de{' '}
        <span className="font-semibold text-ink">{totalCount}</span> citas
      </div>
    </div>
  );
}
