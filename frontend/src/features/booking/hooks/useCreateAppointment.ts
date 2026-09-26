import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAppointment } from '@/lib/api/appointments';
import type { CreateAppointmentDto } from '@/types/api';

export function useCreateAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateAppointmentDto) => createAppointment(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
  });
}
