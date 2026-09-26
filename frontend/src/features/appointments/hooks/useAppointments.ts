'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cancelAppointment, fetchAppointments, rescheduleAppointment } from '@/lib/api/appointments';
import type { AppointmentsQuery, UpdateAppointmentDto } from '@/types/api';

export const appointmentKeys = {
  all: ['appointments'] as const,
  list: (filters: AppointmentsQuery) => ['appointments', 'list', filters] as const,
};

export function useAppointments(filters: AppointmentsQuery = {}) {
  return useQuery({
    queryKey: appointmentKeys.list(filters),
    queryFn: () => fetchAppointments({ ...filters, status: 'ACTIVE' }),
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelAppointment(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      await queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateAppointmentDto }) =>
      rescheduleAppointment(id, dto),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
      await queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}
