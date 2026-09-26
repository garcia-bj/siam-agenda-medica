'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMetrics } from '@/lib/api/metrics';
import type { Specialty } from '@/types/api';

export const metricKeys = {
  all: ['metrics'] as const,
  summary: (from?: string, to?: string, specialty?: Specialty) =>
    ['metrics', 'summary', { from, to, specialty }] as const,
};

export function useMetrics(from?: string, to?: string, specialty?: Specialty) {
  const query = useQuery({
    queryKey: metricKeys.summary(from, to, specialty),
    queryFn: () => fetchMetrics({ from, to, specialty }),
    enabled: Boolean(from && to),
  });

  return {
    data: query.data ?? null,
    isFetching: query.isFetching || query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
