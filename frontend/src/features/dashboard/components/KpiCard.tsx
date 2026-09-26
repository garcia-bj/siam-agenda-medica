'use client';

import React from 'react';

export interface KpiCardProps {
  featured?: boolean;
  label: string;
  value: string;
  detail?: string;
  icon?: React.ReactNode;
  progress?: number;
}

export default function KpiCard({
  featured,
  label,
  value,
  detail,
  icon,
  progress,
}: KpiCardProps) {
  return (
    <div className={`kpi-card ${featured ? 'kpi-card--featured' : ''}`}>
      <div className="kpi-card__head">
        {icon && <div className="kpi-card__icon-wrap">{icon}</div>}
        <span className="kpi-card__label">{label}</span>
      </div>
      <div className="kpi-card__value-wrap">
        <span className="kpi-card__value">{value}</span>
        {typeof progress === 'number' && (
          <div className="kpi-card__progress-line-track">
            <div
              className="kpi-card__progress-line-fill"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        )}
      </div>
      {detail && <div className="kpi-card__detail">{detail}</div>}
    </div>
  );
}
