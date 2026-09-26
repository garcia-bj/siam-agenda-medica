import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiRequestError } from '@/lib/api/client';
import { createAppointment } from '@/lib/api/appointments';
import type { CreateAppointmentDto } from '@/types/api';

interface UseCreateAppointmentOptions {
  /** Called when the server responds with SLOT_TAKEN (409). */
  onSlotTaken?: () => void;
}

export function useCreateAppointment(options: UseCreateAppointmentOptions = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateAppointmentDto) => createAppointment(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
    onError: (err) => {
      if (err instanceof ApiRequestError && err.code === 'SLOT_TAKEN') {
        queryClient.invalidateQueries({ queryKey: ['availability'] });
        options.onSlotTaken?.();
      }
    },
  });
}
