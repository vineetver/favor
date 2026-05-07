"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { DistributionView } from "../types";

export interface MaveUrlState {
  cal: string | null;
  view: DistributionView;
  q: string;
  smin: number | null;
  smax: number | null;
}

type Patch = Partial<MaveUrlState>;

const VIEW_VALUES = new Set<DistributionView>(["overall", "clinical"]);

function parseView(raw: string | null): DistributionView {
  if (raw && VIEW_VALUES.has(raw as DistributionView)) {
    return raw as DistributionView;
  }
  return "overall";
}

function parseNum(raw: string | null): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * URL-backed detail-page state. Single source of truth — components read
 * from `state` and never mirror into local state.
 */
export function useMaveUrlState(): {
  state: MaveUrlState;
  set: (patch: Patch) => void;
} {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const state = useMemo<MaveUrlState>(
    () => ({
      cal: searchParams.get("cal"),
      view: parseView(searchParams.get("view")),
      q: searchParams.get("q") ?? "",
      smin: parseNum(searchParams.get("smin")),
      smax: parseNum(searchParams.get("smax")),
    }),
    [searchParams],
  );

  const set = useCallback(
    (patch: Patch) => {
      const next = new URLSearchParams(searchParams.toString());
      const apply = (
        key: string,
        value: string | number | null | undefined,
      ) => {
        if (value === null || value === undefined || value === "") {
          next.delete(key);
        } else {
          next.set(key, String(value));
        }
      };
      if ("cal" in patch) apply("cal", patch.cal ?? null);
      if ("view" in patch) {
        apply("view", patch.view === "overall" ? null : (patch.view ?? null));
      }
      if ("q" in patch) apply("q", patch.q ?? null);
      if ("smin" in patch) apply("smin", patch.smin);
      if ("smax" in patch) apply("smax", patch.smax);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return { state, set };
}
