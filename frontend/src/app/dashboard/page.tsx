'use client';

import { useMemo, useState } from 'react';
import { useMetrics } from '@/features/dashboard/hooks/useMetrics';
import DateRangeFilter, { type DashboardFilters } from '@/features/dashboard/components/DateRangeFilter';
import KpiCard from '@/features/dashboard/components/KpiCard';
import AppointmentsByDayChart from '@/features/dashboard/components/AppointmentsByDayChart';
import SpecialtyOccupancy from '@/features/dashboard/components/SpecialtyOccupancy';
import PeakHoursChart, { getPeakHour } from '@/features/dashboard/components/PeakHoursChart';
import ExportReportPanel from '@/features/dashboard/components/ExportReportPanel';
import { businessDaysBetween, formatDateRangeLabel, formatISODate } from '@/features/dashboard/utils';

function initialFilters(): DashboardFilters {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMon);
  const friday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 4);

  return {
    from: formatISODate(monday),
    to: formatISODate(friday),
    preset: 'week',
  };
}

export default function DashboardPage() {
  const [filters, setFilters] = useState<DashboardFilters>(initialFilters);
  const metrics = useMetrics(filters.from, filters.to, filters.specialty);
  const data = metrics.data;

  const peak = useMemo(() => (data ? getPeakHour(data.byHour) : null), [data]);
  const businessDays = data?.range.businessDays ?? businessDaysBetween(filters.from, filters.to);
  const dateRangeText = formatDateRangeLabel(filters.from, filters.to);

  return (
    <main className="dashboard-page">
      <div className="dashboard-container">
        <header className="dashboard-header">
          <div>
            <h1>Dashboard</h1>
            <p className="page-description">
              Métricas de la agenda · {dateRangeText}
            </p>
          </div>
          <DateRangeFilter value={filters} onChange={setFilters} />
        </header>

        {metrics.isFetching ? (
          <div className="dashboard-loading" aria-label="Cargando métricas">
            <div className="skeleton-row">
              {[1, 2, 3, 4].map((i) => (
                <div className="skeleton-card" key={i} />
              ))}
            </div>
            <div className="skeleton-chart" />
          </div>
        ) : metrics.isError ? (
          <div className="dashboard-state dashboard-state--error">
            <strong>No pudimos cargar las métricas.</strong>
            <button className="btn btn--secondary" onClick={() => metrics.refetch()}>
              Reintentar
            </button>
          </div>
        ) : !data ? (
          <div className="dashboard-state">
            <strong>No hay datos disponibles para este rango</strong>
          </div>
        ) : (
          <>
            <section className="kpi-grid" aria-label="Indicadores">
              {/* Card 1: Citas activas (Featured) */}
              <KpiCard
                featured
                label="CITAS ACTIVAS"
                value={String(data.totals.active)}
                detail={`${(data.totals.active / Math.max(1, businessDays)).toFixed(1).replace('.', ',')} por día hábil`}
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                }
              />

              {/* Card 2: Ocupación */}
              <KpiCard
                label="OCUPACIÓN"
                value={`${(data.totals.occupancyRate * 100).toFixed(1).replace('.', ',')} %`}
                progress={data.totals.occupancyRate * 100}
                detail={`${data.totals.active} de ${data.totals.capacity} horarios`}
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                }
              />

              {/* Card 3: Cancelaciones */}
              <KpiCard
                label="CANCELACIONES"
                value={String(data.totals.cancelled)}
                detail={`${(data.totals.cancellationRate * 100).toFixed(1).replace('.', ',')} % de las reservas del rango`}
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                }
              />

              {/* Card 4: Hora más solicitada */}
              <KpiCard
                label="HORA MÁS SOLICITADA"
                value={peak?.active ? peak.hour : '—'}
                detail={
                  peak?.active
                    ? `${peak.active} citas entre ${peak.hour} y ${String(Number(peak.hour.slice(0, 2)) + 1).padStart(2, '0')}:00`
                    : 'Sin solicitudes'
                }
                icon={
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                }
              />
            </section>

            <section className="dashboard-grid">
              {/* Top-Left: Citas por día */}
              <article className="dashboard-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Citas por día</h2>
                    <p>Citas activas por día hábil</p>
                  </div>
                </div>
                <AppointmentsByDayChart data={data.byDay} />
              </article>

              {/* Top-Right: Ocupación por especialidad */}
              <article className="dashboard-panel">
                <div className="panel-heading">
                  <div>
                    <h2>Ocupación por especialidad</h2>
                    <p>Citas activas sobre {data.totals.capacity} horarios disponibles en la semana</p>
                  </div>
                </div>
                <SpecialtyOccupancy data={data.bySpecialty} />
              </article>

              {/* Bottom-Left: Horarios más solicitados */}
              <article className="dashboard-panel">
                <div className="panel-heading panel-heading--with-badge">
                  <div>
                    <h2>Horarios más solicitados</h2>
                    <p>Citas activas según la hora de inicio</p>
                  </div>
                  {peak?.active ? (
                    <span className="peak-badge">Hora pico: {peak.hour}</span>
                  ) : null}
                </div>
                <PeakHoursChart data={data.byHour} />
              </article>

              {/* Bottom-Right: Descargar reporte */}
              <ExportReportPanel
                from={filters.from}
                to={filters.to}
                specialty={filters.specialty}
              />
            </section>
          </>
        )}
      </div>
    </main>
  );
}
