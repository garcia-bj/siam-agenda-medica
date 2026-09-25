"use client";

import { useQuery } from "@tanstack/react-query";
import { getMetrics } from "@/lib/api/metrics";
import type { Specialty } from "@/types/api";

export function useMetrics(range: { from: string; to: string }, specialty?: Specialty) {
  return useQuery({
    queryKey: ["metrics", range.from, range.to, specialty],
    queryFn: () => getMetrics({ ...range, specialty }),
    staleTime: 60_000,
  });
}
