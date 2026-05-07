"use client";

import { Skeleton } from "@shared/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { fetchScoresetsForGene } from "../../api";
import type { Page, ScoresetSummary } from "../../types";
import { ScoresetCard } from "./scoreset-card";

interface GeneMaveViewProps {
  geneSymbol: string;
  initialData: (Page<ScoresetSummary> & { via: "symbol" | "search" }) | null;
}

export function GeneMaveView({ geneSymbol, initialData }: GeneMaveViewProps) {
  const {
    data: response,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["mave", "scoresets", "gene", geneSymbol],
    queryFn: () => fetchScoresetsForGene(geneSymbol),
    initialData:
      initialData && initialData.data.length > 0 ? initialData : undefined,
    staleTime: 10 * 60 * 1000,
  });
  const data = response?.data ?? [];
  const via = response?.via ?? "symbol";

  if (isLoading && data.length === 0) {
    return (
      <div
        className="space-y-5"
        aria-busy="true"
        aria-label="Loading MaveDB scoresets"
      >
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-28 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive py-6">
        {error instanceof Error
          ? error.message
          : "Failed to load MaveDB scoresets."}
      </p>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">
          No MaveDB scoresets cover {geneSymbol} yet.
        </p>
        <p className="mt-1">
          Only ~100 of MaveDB&apos;s 2,680 scoresets carry variant data, and
          ~1,100 distinct genes are represented. Many genes never get a
          scoreset. Browse the full catalog to see what&apos;s available, or
          check back next month — the registry grows continuously.
        </p>
        <a
          href="https://www.mavedb.org/search"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-block text-xs text-primary hover:underline"
        >
          Search MaveDB ↗
        </a>
      </div>
    );
  }

  const calibrated = data.filter((s) => s.calibration_titles.length > 0).length;

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-base font-semibold text-foreground">
          Variant Effect Maps (MAVE)
        </h2>
        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
          {data.length} scoreset{data.length === 1 ? "" : "s"} from MaveDB ·{" "}
          {calibrated} with ACMG calibrations.
          {via === "search" && (
            <>
              {" "}
              <span className="text-amber-600 dark:text-amber-400">
                Matched by gene name (no canonical symbol mapping yet).
              </span>
            </>
          )}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data.map((s) => (
          <ScoresetCard key={s.urn} geneSymbol={geneSymbol} scoreset={s} />
        ))}
      </div>
    </div>
  );
}
