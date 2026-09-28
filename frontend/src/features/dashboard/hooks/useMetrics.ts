'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchMetrics } from '@/lib/api/metrics';
import type { MetricsSummary, Specialty } from '@/types/api';
import type { DateRange } from '../utils/dateRanges';

export function useMetrics(range: DateRange, specialty?: Specialty) {
  return useQuery<MetricsSummary>({
    queryKey: ['metrics', range.from, range.to, specialty],
    queryFn: () => fetchMetrics({ from: range.from, to: range.to, specialty }),
    staleTime: 60_000,
  });
}
