import type { AvailabilityQuery, AvailabilityResponse } from '@/types/api';
import { apiFetch } from './client';

export function fetchAvailability(
  query: AvailabilityQuery,
): Promise<AvailabilityResponse> {
  const params = new URLSearchParams({ date: query.date });
  if (query.specialty) params.set('specialty', query.specialty);

  return apiFetch<AvailabilityResponse>(`/availability?${params}`);
}
