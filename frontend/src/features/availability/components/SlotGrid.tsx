'use client';

import type { Slot, Specialty } from '@/types/api';
import { slotTime } from '../dates';
import { useAvailability } from '../hooks/useAvailability';

interface SlotGridProps {
  date: string;
  specialty: Specialty;
  onSelect: (slot: Slot) => void;
  /** startTime del slot elegido. */
  selected?: string;
  /** startTime de la cita que se está reprogramando: se muestra como "Actual". */
  currentSlot?: string;
  columns?: 3 | 6;
}

export default function SlotGrid({ date, specialty, onSelect, selected, currentSlot, columns = 3 }: SlotGridProps) {
  const { data, isPending, isError, refetch, isFetching } = useAvailability(date, specialty);

  if (isPending) {
    return (
      <div role="status" aria-label="Cargando horarios" className={`grid gap-2.5 ${GRID[columns]}`}>
        {Array.from({ length: 18 }, (_, i) => (
          <div key={i} className="h-[52px] animate-pulse rounded-xl bg-busy" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-line p-6 text-center">
        <p className="font-semibold text-ink">No se pudieron cargar los horarios</p>
        <p className="text-sm text-muted">Revisa tu conexión e inténtalo de nuevo.</p>
        <button type="button" className="btn btn--secondary" disabled={isFetching} onClick={() => refetch()}>
          Reintentar
        </button>
      </div>
    );
  }

  if (!data.isBusinessDay) {
    return <Message title="No atendemos este día" description="Elige un día de lunes a viernes." />;
  }

  const slots = data.slots.filter((slot) => slot.specialty === specialty);
  const free = slots.filter((slot) => slot.available).length;
  if (free === 0 && !currentSlot) {
    return <Message title="No quedan horarios libres" description="Prueba con otro día." />;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-semibold text-primary-ink" aria-live="polite">
        {free} {free === 1 ? 'libre' : 'libres'}
      </p>
      <div className={`grid gap-2.5 ${GRID[columns]}`}>
        {slots.map((slot) => {
          const state = slot.startTime === currentSlot ? 'current' : slot.startTime === selected && slot.available ? 'selected' : slot.available ? 'free' : 'busy';
          return (
            <button
              key={slot.startTime}
              type="button"
              disabled={state === 'busy' || state === 'current'}
              aria-pressed={state === 'selected'}
              aria-label={`${slotTime(slot.startTime)}, ${LABEL[state].toLowerCase()}`}
              onClick={() => onSelect(slot)}
              className={`flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl border ${STYLE[state]}`}
            >
              <span className="text-base font-semibold tabular-nums">{slotTime(slot.startTime)}</span>
              <span className="text-xs">{LABEL[state]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const GRID = { 3: 'grid-cols-3', 6: 'grid-cols-3 sm:grid-cols-6' } as const;

const LABEL = { free: 'Libre', busy: 'Ocupado', selected: 'Elegido', current: 'Actual' } as const;

const STYLE = {
  free: 'cursor-pointer border-[#CFCCC3] bg-surface text-ink hover:border-primary',
  busy: 'cursor-not-allowed border-busy bg-busy text-[#6E6A62]',
  selected: 'border-primary bg-primary text-white shadow-[0_0_0_3px_var(--color-primary-soft)]',
  current: 'border-dashed border-primary bg-primary-soft text-primary-ink',
} as const;

function Message({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-line p-6 text-center">
      <p className="font-semibold text-ink">{title}</p>
      <p className="text-sm text-muted">{description}</p>
    </div>
  );
}
