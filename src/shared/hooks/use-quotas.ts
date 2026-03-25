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
import { handle401 } from "@infra/api/handle-auth-error";

async function fetchQuotas(): Promise<Quota[]> {
  const res = await fetch(`${API_BASE}/quotas`, { credentials: "include" });
  if (!res.ok) {
    if (handle401(res.status)) return []; // redirect in progress
    throw new Error(`Quota fetch failed: ${res.status}`);
  }
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
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: "always",
    retry: 1,
  });

  return {
    quotas: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : null,
    refetch: query.refetch,
  };
}

/** Pick a single quota by name. */
export function useQuota(name: string): Quota | undefined {
  const { quotas } = useQuotas();
  return quotas.find((q) => q.name === name);
}
