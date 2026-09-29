'use client';

import type { Specialty } from '@/types/api';

const SPECIALTY_LABELS: Record<Specialty, string> = {
  MEDICINA_GENERAL: 'Medicina General',
  PEDIATRIA: 'Pediatría',
  CARDIOLOGIA: 'Cardiología',
  DERMATOLOGIA: 'Dermatología',
};

interface SpecialtyEntry {
  specialty: Specialty;
  active: number;
  cancelled: number;
  capacity: number;
  occupancyRate: number;
}

interface SpecialtyOccupancyProps {
  data: SpecialtyEntry[];
  slotsPerDay: number;
}

export default function SpecialtyOccupancy({ data, slotsPerDay }: SpecialtyOccupancyProps) {
  return (
    <div className="dashboard-card">
      <div className="dashboard-card__header">
        <h3 className="dashboard-card__title">Ocupación por especialidad</h3>
        <p className="dashboard-card__desc">
          Citas activas sobre {slotsPerDay} horarios disponibles en el rango
        </p>
      </div>
      <div className="specialty-occupancy-list">
        {data.map((entry) => {
          const pct = Math.round(entry.occupancyRate * 100 * 10) / 10;
          return (
            <div key={entry.specialty} className="specialty-occupancy-item">
              <div className="specialty-occupancy-header">
                <span className="specialty-occupancy-name">
                  {SPECIALTY_LABELS[entry.specialty]}
                </span>
                <span className="specialty-occupancy-stats">
                  <strong>{entry.active}</strong> {entry.active === 1 ? 'activa' : 'activas'} · {pct} % · {entry.cancelled} {entry.cancelled === 1 ? 'cancelada' : 'canceladas'}
                </span>
              </div>
              <div
                className="specialty-occupancy-bar"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${SPECIALTY_LABELS[entry.specialty]}: ${pct}% de ocupación`}
              >
                <div
                  className="specialty-occupancy-fill"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
