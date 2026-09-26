'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Appointment } from '@/types/api';
import Button from '@/components/ui/Button';
import AppointmentFilters from '@/features/appointments/components/AppointmentFilters';
import AppointmentList from '@/features/appointments/components/AppointmentList';
import CancelDialog from '@/features/appointments/components/CancelDialog';
import RescheduleDialog from '@/features/appointments/components/RescheduleDialog';
import {
  useAppointments,
  type AppointmentFiltersState,
} from '@/features/appointments/hooks/useAppointments';

export default function CitasPage() {
  const [filters, setFilters] = useState<AppointmentFiltersState>({});
  const [appointmentToCancel, setAppointmentToCancel] =
    useState<Appointment | null>(null);
  const [appointmentToReschedule, setAppointmentToReschedule] =
    useState<Appointment | null>(null);

  const {
    appointments,
    totalCount,
    filteredCount,
    isLoading,
    isError,
    refetch,
  } = useAppointments(filters);

  const handleClearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Boolean(filters.specialty || filters.date);

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 lg:px-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold lg:text-4xl">
            Citas agendadas
          </h1>
          <p className="mt-1.5 text-muted">
            Consulta y filtra todas las citas activas de la clínica.
          </p>
        </div>
        <div>
          <Link href="/">
            <Button variant="primary">Nueva cita</Button>
          </Link>
        </div>
      </div>

      <AppointmentFilters
        filters={filters}
        onFilterChange={setFilters}
        onClearFilters={handleClearFilters}
        filteredCount={filteredCount}
        totalCount={totalCount}
      />

      <AppointmentList
        appointments={appointments}
        isLoading={isLoading}
        isError={isError}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
        onRetry={refetch}
        onCancel={(appt) => setAppointmentToCancel(appt)}
        onReschedule={(appt) => setAppointmentToReschedule(appt)}
      />

      <CancelDialog
        appointment={appointmentToCancel}
        open={Boolean(appointmentToCancel)}
        onClose={() => setAppointmentToCancel(null)}
      />

      <RescheduleDialog
        appointment={appointmentToReschedule}
        open={Boolean(appointmentToReschedule)}
        onClose={() => setAppointmentToReschedule(null)}
      />
    </main>
  );
}
