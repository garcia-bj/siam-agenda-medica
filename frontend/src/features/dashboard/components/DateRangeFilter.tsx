'use client';

import React from 'react';
import { SPECIALTIES, type Specialty } from '@/types/api';
import { formatISODate } from '../utils';

export interface DashboardFilters {
  from: string;
  to: string;
  specialty?: Specialty;
  preset?: string;
}

interface DateRangeFilterProps {
  value: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
}

export default function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const handlePresetChange = (preset: string) => {
    const now = new Date();
    let fromDate = new Date();
    let toDate = new Date();

    if (preset === 'week') {
      const day = now.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon);
      toDate = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() + 4);
    } else if (preset === 'month') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    onChange({
      ...value,
      preset,
      from: formatISODate(fromDate),
      to: formatISODate(toDate),
    });
  };

  const activePreset = value.preset ?? 'week';

  return (
    <div className="dashboard-filter-bar">
      <div className="preset-pill-group">
        <button
          type="button"
          className={`preset-pill ${activePreset === 'week' ? 'is-active' : ''}`}
          onClick={() => handlePresetChange('week')}
        >
          Esta semana
        </button>
        <button
          type="button"
          className={`preset-pill ${activePreset === 'month' ? 'is-active' : ''}`}
          onClick={() => handlePresetChange('month')}
        >
          Este mes
        </button>
        <button
          type="button"
          className={`preset-pill ${activePreset === 'custom' ? 'is-active' : ''}`}
          onClick={() => onChange({ ...value, preset: 'custom' })}
        >
          📅 Personalizado
        </button>
      </div>

      {activePreset === 'custom' && (
        <div className="custom-date-inputs">
          <input
            type="date"
            className="field__input field__input--sm"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value, preset: 'custom' })}
          />
          <span>–</span>
          <input
            type="date"
            className="field__input field__input--sm"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value, preset: 'custom' })}
          />
        </div>
      )}

      <div className="specialty-filter-select">
        <select
          className="field__select field__select--pill"
          value={value.specialty || ''}
          onChange={(e) =>
            onChange({
              ...value,
              specialty: (e.target.value as Specialty) || undefined,
            })
          }
        >
          <option value="">Todas las especialidades</option>
          {SPECIALTIES.map((spec) => (
            <option key={spec} value={spec}>
              {spec.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
