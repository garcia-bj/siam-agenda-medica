'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import AppointmentFilters from '@/features/appointments/components/AppointmentFilters';
import AppointmentList from '@/features/appointments/components/AppointmentList';
import CancelDialog from '@/features/appointments/components/CancelDialog';
import RescheduleDialog from '@/features/appointments/components/RescheduleDialog';
import Button from '@/components/ui/Button';
import type { Appointment, AppointmentsQuery } from '@/types/api';
import { useAppointments } from '@/features/appointments/hooks/useAppointments';

export default function CitasPage() {
  const [filters, setFilters] = useState<AppointmentsQuery & { search?: string }>({});
  const [cancelAppointment, setCancelAppointment] = useState<Appointment | null>(null);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);

  const query = useAppointments({
    specialty: filters.specialty,
    date: filters.date,
  });

  const totalQuery = useAppointments({});

  const filteredAppointments = useMemo(() => {
    const rawData = query.data?.data ?? [];
    if (!filters.search) return rawData;
    const term = filters.search.toLowerCase().trim();
    return rawData.filter((apt) =>
      apt.patientName.toLowerCase().includes(term) ||
      apt.patientEmail.toLowerCase().includes(term) ||
      apt.specialty.toLowerCase().includes(term)
    );
  }, [query.data?.data, filters.search]);

  const count = filteredAppointments.length;
  const total = totalQuery.data?.data.length ?? 0;

  const handleExportPdf = () => {
    window.print();
  };

  return (
    <main className="appointments-page">
      <div className="appointments-container">
        <header className="appointments-header">
          <div>
            <p className="page-eyebrow">Gestión de Turnos</p>
            <h1>Citas agendadas</h1>
            <p className="page-description">Consulta, reprograma o cancela tus próximas citas.</p>
          </div>
          <div className="appointments-header-actions">
            <Button variant="secondary" onClick={handleExportPdf}>
              📄 Reporte PDF
            </Button>
            <Button variant="ghost" onClick={() => query.refetch()}>
              🔄 Actualizar
            </Button>
            <Link href="/"><Button>+ Nueva cita</Button></Link>
          </div>
        </header>

        <AppointmentFilters
          value={filters}
          onChange={setFilters}
        />

        <div className="appointments-summary" aria-live="polite">
          Mostrando <strong>{count}</strong> de <strong>{total}</strong> citas
        </div>

        <AppointmentList
          appointments={filteredAppointments}
          loading={query.isLoading}
          error={query.isError}
          onCancel={setCancelAppointment}
          onReschedule={setRescheduleAppointment}
        />
      </div>

      <CancelDialog appointment={cancelAppointment} onClose={() => setCancelAppointment(null)} />
      <RescheduleDialog appointment={rescheduleAppointment} onClose={() => setRescheduleAppointment(null)} />
    </main>
  );
}
