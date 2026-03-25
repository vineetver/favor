"use client";

import { useQuery } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Quota {
  name: string;
  used: number;
  limit: number;
  resets: string;
}

interface QuotaResponse {
  quotas: Quota[];
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

import { API_BASE } from "@/config/api";

async function fetchQuotas(): Promise<Quota[]> {
  const res = await fetch(`${API_BASE}/quotas`, { credentials: "include" });
  if (!res.ok) throw new Error(`Quota fetch failed: ${res.status}`);
  const data: QuotaResponse = await res.json();
  return data.quotas;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useQuotas() {
  const query = useQuery({
    queryKey: ["quotas"],
    queryFn: fetchQuotas,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  });

  return {
    quotas: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
  };
}

/** Pick a single quota by name. */
export function useQuota(name: string): Quota | undefined {
  const { quotas } = useQuotas();
  return quotas.find((q) => q.name === name);
}
