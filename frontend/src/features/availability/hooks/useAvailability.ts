import { useQuery } from '@tanstack/react-query';
import { fetchAvailability } from '@/lib/api/availability';
import type { Specialty } from '@/types/api';

export function useAvailability(date: string, specialty?: Specialty) {
  return useQuery({
    queryKey: ['availability', date, specialty],
    queryFn: () => fetchAvailability({ date, specialty }),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}
