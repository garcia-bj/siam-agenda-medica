'use client';

import { useState } from 'react';
import type { Specialty } from '@/types/api';
import { SPECIALTIES } from '@/types/api';
import type { DateRange, RangePreset } from '../utils/dateRanges';
import { currentWeekRange, currentMonthRange } from '../utils/dateRanges';

const SPECIALTY_LABELS: Record<Specialty, string> = {
  MEDICINA_GENERAL: 'Medicina General',
  PEDIATRIA: 'Pediatría',
  CARDIOLOGIA: 'Cardiología',
  DERMATOLOGIA: 'Dermatología',
};

interface DateRangeFilterProps {
  range: DateRange;
  preset: RangePreset;
  specialty: Specialty | undefined;
  onRangeChange: (range: DateRange, preset: RangePreset) => void;
  onSpecialtyChange: (specialty: Specialty | undefined) => void;
}

export default function DateRangeFilter({
  range,
  preset,
  specialty,
  onRangeChange,
  onSpecialtyChange,
}: DateRangeFilterProps) {
  const [customFrom, setCustomFrom] = useState(range.from);
  const [customTo, setCustomTo] = useState(range.to);

  const handlePreset = (p: RangePreset) => {
    if (p === 'week') onRangeChange(currentWeekRange(), 'week');
    else if (p === 'month') onRangeChange(currentMonthRange(), 'month');
    else onRangeChange({ from: customFrom, to: customTo }, 'custom');
  };

  const handleCustomFrom = (v: string) => {
    setCustomFrom(v);
    if (v && customTo) onRangeChange({ from: v, to: customTo }, 'custom');
  };

  const handleCustomTo = (v: string) => {
    setCustomTo(v);
    if (customFrom && v) onRangeChange({ from: customFrom, to: v }, 'custom');
  };

  return (
    <div className="date-range-filter">
      <div className="date-range-tabs" role="tablist" aria-label="Rango de fechas">
        <button
          role="tab"
          aria-selected={preset === 'week'}
          className={`date-range-tab ${preset === 'week' ? 'date-range-tab--active' : ''}`}
          onClick={() => handlePreset('week')}
          type="button"
        >
          Esta semana
        </button>
        <button
          role="tab"
          aria-selected={preset === 'month'}
          className={`date-range-tab ${preset === 'month' ? 'date-range-tab--active' : ''}`}
          onClick={() => handlePreset('month')}
          type="button"
        >
          Este mes
        </button>
        <button
          role="tab"
          aria-selected={preset === 'custom'}
          className={`date-range-tab ${preset === 'custom' ? 'date-range-tab--active' : ''}`}
          onClick={() => handlePreset('custom')}
          type="button"
        >
          ⚙ Personalizado
        </button>
      </div>

      {preset === 'custom' && (
        <div className="date-range-custom">
          <div className="field">
            <label className="field__label" htmlFor="dash-from">Desde</label>
            <input
              id="dash-from"
              type="date"
              className="field__input"
              value={customFrom}
              onChange={(e) => handleCustomFrom(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="dash-to">Hasta</label>
            <input
              id="dash-to"
              type="date"
              className="field__input"
              value={customTo}
              onChange={(e) => handleCustomTo(e.target.value)}
            />
          </div>
        </div>
      )}

      <div className="field">
        <select
          id="dash-specialty"
          className="field__select"
          value={specialty ?? ''}
          onChange={(e) => onSpecialtyChange(e.target.value ? (e.target.value as Specialty) : undefined)}
          aria-label="Filtrar por especialidad"
        >
          <option value="">Todas las especialidades</option>
          {SPECIALTIES.map((s) => (
            <option key={s} value={s}>
              {SPECIALTY_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
