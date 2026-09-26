import { useQuery } from '@tanstack/react-query';
import { fetchAppointments } from '@/lib/api/appointments';
import type { Appointment, Specialty } from '@/types/api';

export interface AppointmentFiltersState {
  specialty?: Specialty | '';
  date?: string;
}

export function useAppointments(filters: AppointmentFiltersState = {}) {
  const specialty = filters.specialty || undefined;
  const date = filters.date || undefined;

  const totalQuery = useQuery({
    queryKey: ['appointments', { status: 'ACTIVE' }],
    queryFn: () => fetchAppointments({ status: 'ACTIVE' }),
  });

  const isFiltered = Boolean(specialty || date);

  const filteredQuery = useQuery({
    queryKey: ['appointments', { status: 'ACTIVE', specialty, date }],
    queryFn: () => fetchAppointments({ status: 'ACTIVE', specialty, date }),
    enabled: isFiltered,
  });

  const totalAppointments: Appointment[] = totalQuery.data?.data ?? [];
  const filteredAppointments: Appointment[] = isFiltered
    ? (filteredQuery.data?.data ?? [])
    : totalAppointments;

  const sortedAppointments = [...filteredAppointments].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  return {
    appointments: sortedAppointments,
    totalCount: totalAppointments.length,
    filteredCount: sortedAppointments.length,
    isLoading: totalQuery.isLoading || (isFiltered && filteredQuery.isLoading),
    isError: totalQuery.isError || (isFiltered && filteredQuery.isError),
    error: totalQuery.error || filteredQuery.error,
    refetch: () => {
      totalQuery.refetch();
      if (isFiltered) filteredQuery.refetch();
    },
  };
}
