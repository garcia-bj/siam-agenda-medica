'use client';

import type { ReactNode } from 'react';

export interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  variant?: 'default' | 'highlight';
}

export default function KpiCard({ icon, label, value, subtitle, variant = 'default' }: KpiCardProps) {
  return (
    <div className={`kpi-card ${variant === 'highlight' ? 'kpi-card--highlight' : ''}`}>
      <div className="kpi-card__icon">{icon}</div>
      <div className="kpi-card__content">
        <span className="kpi-card__label">{label}</span>
        <span className="kpi-card__value">{value}</span>
        {subtitle && <span className="kpi-card__subtitle">{subtitle}</span>}
      </div>
    </div>
  );
}
