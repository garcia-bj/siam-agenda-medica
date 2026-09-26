'use client';

import React from 'react';

export interface HourData {
  hour: string;
  active: number;
}

export function getPeakHour(byHour: HourData[]): HourData | null {
  if (!byHour || byHour.length === 0) return null;
  return byHour.reduce<HourData | null>((max, curr) => {
    if (!max || curr.active > max.active) return curr;
    return max;
  }, null);
}

export interface PeakHoursChartProps {
  data: HourData[];
}

export default function PeakHoursChart({ data }: PeakHoursChartProps) {
  if (!data || data.length === 0) {
    return <div className="empty-chart">Sin horarios registrados</div>;
  }

  const peak = getPeakHour(data);
  const maxActive = Math.max(1, ...data.map((d) => d.active));

  return (
    <div className="peak-hours-grid-wrapper">
      <div className="peak-hours-grid">
        {data.map((item) => {
          const isPeak = peak?.hour === item.hour && item.active > 0;
          const heightPct = (item.active / maxActive) * 100;
          const formattedHour = item.hour.length === 5 ? `${item.hour.slice(0, 2)}h` : item.hour;

          return (
            <div
              key={item.hour}
              className={`peak-hour-column ${isPeak ? 'is-peak' : ''}`}
            >
              <div className="peak-hour-count">{item.active > 0 ? item.active : ''}</div>
              <div className="peak-hour-track">
                <div
                  className="peak-hour-bar"
                  style={{ height: `${Math.max(6, heightPct)}%` }}
                />
              </div>
              <div className="peak-hour-label">{formattedHour}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
