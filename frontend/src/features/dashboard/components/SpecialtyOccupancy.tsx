'use client';

import React from 'react';
import type { Specialty } from '@/types/api';

const labels: Record<Specialty, string> = {
  MEDICINA_GENERAL: 'Medicina General',
  PEDIATRIA: 'Pediatría',
  CARDIOLOGIA: 'Cardiología',
  DERMATOLOGIA: 'Dermatología',
};

export interface SpecialtyOccupancyItem {
  specialty: Specialty;
  active: number;
  cancelled: number;
  capacity: number;
  occupancyRate: number;
}

export interface SpecialtyOccupancyProps {
  data: SpecialtyOccupancyItem[];
}

export default function SpecialtyOccupancy({ data }: SpecialtyOccupancyProps) {
  if (!data || data.length === 0) {
    return <div className="empty-chart">Sin datos de especialidad</div>;
  }

  const totalActive = data.reduce((acc, curr) => acc + curr.active, 0);

  return (
    <div className="specialty-occupancy-list">
      {data.map((item) => {
        const name = labels[item.specialty] || item.specialty;
        const pct = totalActive > 0 ? ((item.active / totalActive) * 100).toFixed(1) : '0';
        const ratePct = Math.round(item.occupancyRate * 100);

        return (
          <div key={item.specialty} className="specialty-occupancy-item">
            <div className="specialty-occupancy-head">
              <span className="specialty-name">{name}</span>
              <span className="specialty-metrics">
                <strong>{item.active} activas</strong> · {pct}% · {item.cancelled} canceladas
              </span>
            </div>
            <div className="specialty-track">
              <div
                className="specialty-bar"
                style={{ width: `${Math.min(100, Math.max(5, ratePct))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
