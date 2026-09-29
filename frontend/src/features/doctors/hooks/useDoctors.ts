import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createDoctor, fetchDoctors, updateDoctor } from '@/lib/api/doctors';
import type { CreateDoctorDto, UpdateDoctorDto } from '@/types/api';

export function useDoctors() {
  return useQuery({ queryKey: ['doctors'], queryFn: fetchDoctors });
}

// Un cambio de médicos también cambia qué especialidades tienen horarios.
function useRefreshDoctors() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['doctors'] });
    queryClient.invalidateQueries({ queryKey: ['availability'] });
  };
}

export function useCreateDoctor() {
  const refresh = useRefreshDoctors();
  return useMutation({
    mutationFn: (dto: CreateDoctorDto) => createDoctor(dto),
    onSuccess: () => {
      refresh();
      toast.success('Médico registrado');
    },
  });
}

export function useUpdateDoctor() {
  const refresh = useRefreshDoctors();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateDoctorDto }) => updateDoctor(id, dto),
    onSuccess: (_doctor, { dto }) => {
      refresh();
      if (dto.active === false) toast.success('Médico desactivado');
      else if (dto.active === true) toast.success('Médico reactivado');
      else toast.success('Médico actualizado');
    },
    // Un 409 significa que la lista que vemos quedó vieja: la recargamos.
    onError: refresh,
  });
}
