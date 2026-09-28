'use client';

import { useState } from 'react';
import type { Specialty } from '@/types/api';
import DateRangeFilter from '@/features/dashboard/components/DateRangeFilter';
import KpiCard from '@/features/dashboard/components/KpiCard';
import AppointmentsByDayChart from '@/features/dashboard/components/AppointmentsByDayChart';
import SpecialtyOccupancy from '@/features/dashboard/components/SpecialtyOccupancy';
import PeakHoursChart from '@/features/dashboard/components/PeakHoursChart';
import { useMetrics } from '@/features/dashboard/hooks/useMetrics';
import {
  currentWeekRange,
  formatRange,
  findPeakHour,
} from '@/features/dashboard/utils/dateRanges';
import type { DateRange, RangePreset } from '@/features/dashboard/utils/dateRanges';
import { ApiRequestError } from '@/lib/api/client';

/* ── SVG Icons (inline to avoid extra deps) ────────────────────────── */

function CalendarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function TrendUpIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

/* ── Skeleton ────────────────────────────────────────────────────── */

function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" aria-busy="true" aria-label="Cargando métricas">
      <div className="kpi-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="kpi-card kpi-card--skeleton">
            <div className="skeleton-box" style={{ width: 40, height: 40, borderRadius: 10 }} />
            <div className="kpi-card__content">
              <div className="skeleton-box" style={{ width: 100, height: 12 }} />
              <div className="skeleton-box" style={{ width: 60, height: 28, marginTop: 4 }} />
            </div>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-card dashboard-card--skeleton" style={{ height: 320 }} />
        <div className="dashboard-card dashboard-card--skeleton" style={{ height: 320 }} />
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-card dashboard-card--skeleton" style={{ height: 300 }} />
      </div>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const [range, setRange] = useState<DateRange>(currentWeekRange);
  const [preset, setPreset] = useState<RangePreset>('week');
  const [specialty, setSpecialty] = useState<Specialty | undefined>();

  const { data: metrics, isLoading, isError, error, refetch } = useMetrics(range, specialty);

  const handleRangeChange = (r: DateRange, p: RangePreset) => {
    setRange(r);
    setPreset(p);
  };

  const rangeLabel = formatRange(range);

  const peak = metrics ? findPeakHour(metrics.byHour) : null;
  const nextHour = peak
    ? `${String(Number(peak.hour.slice(0, 2)) + 1).padStart(2, '0')}:00`
    : null;

  const userMessage = error instanceof ApiRequestError
    ? error.message
    : 'Error de conexión. Verifica tu red.';

  return (
    <main className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1 className="font-heading dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">
            Métricas de la agenda · {rangeLabel}
          </p>
        </div>
        <DateRangeFilter
          range={range}
          preset={preset}
          specialty={specialty}
          onRangeChange={handleRangeChange}
          onSpecialtyChange={setSpecialty}
        />
      </div>

      {isLoading && <DashboardSkeleton />}

      {isError && (
        <div className="empty-state">
          <p className="empty-state__title">No se pudieron cargar las métricas</p>
          <p className="empty-state__desc">
            {userMessage}
          </p>
          <button className="btn btn--primary" onClick={() => refetch()} type="button">
            Reintentar
          </button>
        </div>
      )}

      {!isLoading && !isError && metrics && metrics.totals.active === 0 && metrics.totals.cancelled === 0 && (
        <div className="empty-state">
          <p className="empty-state__title">No hay citas en este rango</p>
          <p className="empty-state__desc">
            Prueba seleccionando otro período o quitando el filtro de especialidad.
          </p>
        </div>
      )}

      {!isLoading && !isError && metrics && (metrics.totals.active > 0 || metrics.totals.cancelled > 0) && (
        <>
          {/* KPI Cards */}
          <div className="kpi-grid">
            <KpiCard
              icon={<CalendarIcon />}
              label="CITAS ACTIVAS"
              value={metrics.totals.active}
              subtitle={`${(metrics.totals.active / Math.max(metrics.range.businessDays, 1)).toFixed(1)} por día hábil`}
              variant="highlight"
            />
            <KpiCard
              icon={<TrendUpIcon />}
              label="OCUPACIÓN"
              value={`${(metrics.totals.occupancyRate * 100).toFixed(1)} %`}
              subtitle={`${metrics.totals.active} de ${metrics.totals.capacity} horarios`}
            />
            <KpiCard
              icon={<XCircleIcon />}
              label="CANCELACIONES"
              value={metrics.totals.cancelled}
              subtitle={`${(metrics.totals.cancellationRate * 100).toFixed(1)} % de las reservas del rango`}
            />
            <KpiCard
              icon={<ClockIcon />}
              label="HORA MÁS SOLICITADA"
              value={peak?.hour ?? '—'}
              subtitle={
                peak ? `${peak.active} citas entre ${peak.hour} y ${nextHour}` : 'Sin datos'
              }
            />
          </div>

          {/* Charts Row */}
          <div className="dashboard-grid">
            <AppointmentsByDayChart data={metrics.byDay} />
            <SpecialtyOccupancy
              data={metrics.bySpecialty}
              slotsPerDay={metrics.totals.capacity / Math.max(specialty ? 1 : 4, 1)}
            />
          </div>

          {/* Peak Hours */}
          <div className="dashboard-grid dashboard-grid--single">
            <PeakHoursChart data={metrics.byHour} />
          </div>
        </>
      )}
    </main>
  );
}
