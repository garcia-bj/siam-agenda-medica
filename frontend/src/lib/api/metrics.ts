import type { MetricsQuery, MetricsSummary } from '@/types/api';
import { apiFetch } from './client';

export function fetchMetrics(
  query: MetricsQuery = {},
): Promise<MetricsSummary> {
  const params = new URLSearchParams();
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.specialty) params.set('specialty', query.specialty);

  const qs = params.toString();
  return apiFetch<MetricsSummary>(`/metrics/summary${qs ? `?${qs}` : ''}`);
}
