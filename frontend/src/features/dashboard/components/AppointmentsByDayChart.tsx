'use client';
import type { MetricsSummary } from '@/types/api';
import { formatShortDate } from '../utils';

export default function AppointmentsByDayChart({ data }: { data: MetricsSummary['byDay'] }) {
  const max = Math.max(1, ...data.map(d => d.active));
  return <div className="bar-chart" aria-label="Citas por día">{data.map(row => <div className="bar-chart__item" key={row.date}><div className="bar-chart__value" role="img" tabIndex={0} title={`${row.active} citas activas`}>{row.active > 0 ? row.active : ''}<span className="chart-tooltip" role="tooltip">{row.active} citas activas</span></div><div className="bar-chart__track"><span style={{ height: `${Math.max(3, row.active / max * 100)}%` }} /></div><span className="bar-chart__label">{formatShortDate(row.date)}</span></div>)}</div>;
}
