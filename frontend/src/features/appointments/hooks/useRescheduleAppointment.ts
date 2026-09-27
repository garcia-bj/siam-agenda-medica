import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { rescheduleAppointment } from '@/lib/api/appointments';
import { ApiRequestError } from '@/lib/api/client';
import type { UpdateAppointmentDto } from '@/types/api';

interface RescheduleParams {
  id: string;
  dto: UpdateAppointmentDto;
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: RescheduleParams) => rescheduleAppointment(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast.success('Cita reprogramada con éxito');
    },
    onError: (error: unknown) => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });

      if (
        error instanceof ApiRequestError &&
        (error.code === 'ALREADY_CANCELLED' || error.code === 'NOT_FOUND')
      ) {
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        queryClient.invalidateQueries({ queryKey: ['metrics'] });
        toast.info('La cita ya no está activa. Se actualizó la agenda.');
      }
    },
  });
}
