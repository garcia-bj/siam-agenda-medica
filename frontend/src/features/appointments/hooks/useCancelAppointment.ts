import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cancelAppointment } from '@/lib/api/appointments';

export function useCancelAppointment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
      toast.success('Cita cancelada con éxito');
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Error al cancelar la cita';
      toast.error(message);
    },
  });
}
