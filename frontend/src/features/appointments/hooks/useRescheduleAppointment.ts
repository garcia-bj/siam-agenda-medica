import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { rescheduleAppointment } from '@/lib/api/appointments';
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
      toast.success('Cita reprogramada con éxito');
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}
