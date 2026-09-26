'use client';

import { useState } from 'react';
import { formatDayLong, isSelectable, monthGrid, monthLabel } from '../dates';

const WEEK_HEADER = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

interface DatePickerProps {
  value: string;
  today: string;
  onChange: (date: string) => void;
}

/** Calendario mensual: solo se eligen días hábiles desde hoy. */
export default function DatePicker({ value, today, onChange }: DatePickerProps) {
  const [view, setView] = useState(() => ({ year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)) - 1 }));
  const move = (delta: number) =>
    setView(({ year, month }) => {
      const next = new Date(Date.UTC(year, month + delta, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });
  const canGoBack = `${view.year}-${String(view.month + 1).padStart(2, '0')}` > today.slice(0, 7);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Mes anterior" disabled={!canGoBack} onClick={() => move(-1)} className={NAV_BUTTON}>
          <Chevron direction="left" />
        </button>
        <span className="font-heading text-xl font-semibold" aria-live="polite">
          {monthLabel(view.year, view.month)}
        </span>
        <button type="button" aria-label="Mes siguiente" onClick={() => move(1)} className={NAV_BUTTON}>
          <Chevron direction="right" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {WEEK_HEADER.map((day) => (
          <span key={day} aria-hidden="true" className="pb-1.5 text-center text-xs font-semibold text-muted">
            {day}
          </span>
        ))}
        {monthGrid(view.year, view.month).map((day) => {
          const inMonth = Number(day.slice(5, 7)) - 1 === view.month;
          const selectable = inMonth && isSelectable(day, today);
          const selected = selectable && day === value;
          return (
            <button
              key={day}
              type="button"
              disabled={!selectable}
              aria-pressed={selectable ? selected : undefined}
              aria-current={day === today ? 'date' : undefined}
              aria-label={`${formatDayLong(day)}${selectable ? '' : ', no disponible'}`}
              onClick={() => onChange(day)}
              className={`flex h-10 items-center justify-center rounded-[10px] border text-[15px] tabular-nums ${dayClass(
                { inMonth, selectable, selected, isToday: day === today },
              )}`}
            >
              {Number(day.slice(8, 10))}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const NAV_BUTTON =
  'flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-ink disabled:opacity-40';

function dayClass({ inMonth, selectable, selected, isToday }: Record<string, boolean>) {
  if (selected) return 'border-primary bg-primary font-semibold text-white';
  if (selectable) return `bg-surface font-medium text-ink hover:border-primary ${isToday ? 'border-primary' : 'border-line'}`;
  if (isToday) return 'border-primary font-semibold text-primary-ink';
  return `border-transparent ${inMonth ? 'text-[#8A857C]' : 'text-[#B5B0A6]'}`;
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={direction === 'left' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} />
    </svg>
  );
}
