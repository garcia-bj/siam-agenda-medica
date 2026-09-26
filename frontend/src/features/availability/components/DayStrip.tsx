import { businessDaysFrom, formatDayLong, weekdayShort } from '../dates';

interface DayStripProps {
  value: string;
  from: string;
  onChange: (date: string) => void;
  days?: number;
}

/** Tira de días hábiles consecutivos (móvil y modal de reprogramar). */
export default function DayStrip({ value, from, onChange, days = 5 }: DayStripProps) {
  return (
    <div role="group" aria-label="Día" className="grid gap-2" style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}>
      {businessDaysFrom(from, days).map((day) => {
        const selected = day === value;
        return (
          <button
            key={day}
            type="button"
            aria-pressed={selected}
            aria-label={formatDayLong(day)}
            onClick={() => onChange(day)}
            className={`flex h-16 flex-col items-center justify-center gap-0.5 rounded-xl border ${
              selected ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-ink hover:border-primary'
            }`}
          >
            <span className={`text-xs ${selected ? 'text-primary-soft' : 'text-muted'}`}>{weekdayShort(day)}</span>
            <span className="text-lg font-semibold tabular-nums">{Number(day.slice(8, 10))}</span>
          </button>
        );
      })}
    </div>
  );
}
