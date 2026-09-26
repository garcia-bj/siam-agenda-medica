import Link from 'next/link';
import type { Appointment } from '@/types/api';
import SpecialtyTag from '@/components/ui/SpecialtyTag';
import EmptyState from '@/components/ui/EmptyState';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import {
  formatAppointmentDate,
  formatAppointmentTime,
  getInitials,
} from '../utils/formatDate';

interface AppointmentListProps {
  appointments: Appointment[];
  isLoading?: boolean;
  isError?: boolean;
  hasActiveFilters?: boolean;
  onClearFilters?: () => void;
  onRetry?: () => void;
}

export default function AppointmentList({
  appointments,
  isLoading = false,
  isError = false,
  hasActiveFilters = false,
  onClearFilters,
  onRetry,
}: AppointmentListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <Spinner size={32} />
        <p className="text-sm font-medium text-muted">Cargando citas...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-line bg-surface p-8 text-center">
        <p className="text-base font-semibold text-danger">
          Ocurrió un error al cargar la lista de citas.
        </p>
        {onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-line bg-surface py-12 px-4 text-center">
        <EmptyState
          title={hasActiveFilters ? 'No se encontraron citas' : 'No hay citas agendadas'}
          description={
            hasActiveFilters
              ? 'No hay citas activas que coincidan con los filtros seleccionados.'
              : 'Aún no hay citas registradas en la agenda médica.'
          }
        />
        {hasActiveFilters && onClearFilters ? (
          <Button variant="secondary" onClick={onClearFilters}>
            Limpiar filtros
          </Button>
        ) : (
          <Link href="/">
            <Button variant="primary">Agendar una cita</Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-bg text-xs font-semibold uppercase tracking-wider text-muted">
            <tr>
              <th scope="col" className="px-6 py-3.5">
                Paciente
              </th>
              <th scope="col" className="px-6 py-3.5">
                Email
              </th>
              <th scope="col" className="px-6 py-3.5">
                Especialidad
              </th>
              <th scope="col" className="px-6 py-3.5">
                Fecha
              </th>
              <th scope="col" className="px-6 py-3.5">
                Hora
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {appointments.map((appt) => {
              const initials = getInitials(appt.patientName);
              const dateFormatted = formatAppointmentDate(appt.startTime);
              const timeFormatted = formatAppointmentTime(appt.startTime);

              return (
                <tr key={appt.id} className="hover:bg-bg/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-ink">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary-ink"
                        aria-hidden="true"
                      >
                        {initials}
                      </div>
                      <span>{appt.patientName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted">{appt.patientEmail}</td>
                  <td className="px-6 py-4">
                    <SpecialtyTag specialty={appt.specialty} />
                  </td>
                  <td className="px-6 py-4 text-ink font-medium">
                    {dateFormatted}
                  </td>
                  <td className="px-6 py-4 text-ink font-medium">
                    {timeFormatted}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View */}
      <div className="flex flex-col gap-3 md:hidden">
        {appointments.map((appt) => {
          const initials = getInitials(appt.patientName);
          const dateFormatted = formatAppointmentDate(appt.startTime);
          const timeFormatted = formatAppointmentTime(appt.startTime);

          return (
            <article
              key={appt.id}
              className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4 shadow-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary-ink"
                    aria-hidden="true"
                  >
                    {initials}
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink leading-snug">
                      {appt.patientName}
                    </h3>
                    <p className="text-xs text-muted">{appt.patientEmail}</p>
                  </div>
                </div>
                <SpecialtyTag specialty={appt.specialty} />
              </div>

              <div className="flex items-center justify-between border-t border-line/60 pt-2.5 text-xs text-muted">
                <span>
                  Fecha: <strong className="text-ink">{dateFormatted}</strong>
                </span>
                <span>
                  Hora: <strong className="text-ink">{timeFormatted}</strong>
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
