import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cancelAppointment } from '@/lib/api/appointments';
import { ApiRequestError } from '@/lib/api/client';

export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
      toast.success('Cita cancelada con éxito');
    },
    onError: (error: unknown) => {
      if (
        error instanceof ApiRequestError &&
        (error.code === 'ALREADY_CANCELLED' || error.code === 'NOT_FOUND')
      ) {
        queryClient.invalidateQueries({ queryKey: ['appointments'] });
        queryClient.invalidateQueries({ queryKey: ['availability'] });
        queryClient.invalidateQueries({ queryKey: ['metrics'] });
        toast.info('La cita ya no está activa. Se actualizó la agenda.');
        return;
      }

      toast.error('No se pudo cancelar la cita. Inténtalo de nuevo.');
    },
  });
}
