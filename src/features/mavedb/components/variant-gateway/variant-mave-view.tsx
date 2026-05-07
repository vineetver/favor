"use client";

import { Skeleton } from "@shared/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchVariantBands } from "../../api";
import type { LabelClass, VariantBand } from "../../types";
import { CountPills } from "./count-pills";
import { ScoresetCard } from "./scoreset-card";

interface VariantMaveViewProps {
  vcf: string;
  initialData: VariantBand[];
}

interface ScoresetGroup {
  urn: string;
  title: string;
  publishedDate: string | null;
  bands: VariantBand[];
}

function groupByScoreset(bands: VariantBand[]): ScoresetGroup[] {
  const map = new Map<string, ScoresetGroup>();
  for (const b of bands) {
    const existing = map.get(b.scoreset_urn);
    if (existing) {
      existing.bands.push(b);
      continue;
    }
    map.set(b.scoreset_urn, {
      urn: b.scoreset_urn,
      title: b.scoreset_title,
      publishedDate: b.published_date,
      bands: [b],
    });
  }
  return [...map.values()];
}

export function VariantMaveView({ vcf, initialData }: VariantMaveViewProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["mave", "variant", vcf],
    queryFn: () => fetchVariantBands(vcf),
    initialData: initialData.length > 0 ? initialData : undefined,
    staleTime: 10 * 60 * 1000,
  });
  const bands = data ?? [];
  const [activeClass, setActiveClass] = useState<LabelClass | null>(null);

  const filtered = useMemo(
    () =>
      activeClass ? bands.filter((b) => b.label_class === activeClass) : bands,
    [bands, activeClass],
  );

  const groups = useMemo(() => groupByScoreset(filtered), [filtered]);

  if (isLoading && bands.length === 0) {
    return (
      <div
        className="space-y-6"
        aria-busy="true"
        aria-label="Loading MAVE evidence"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
        <Skeleton className="h-3 w-72" />
        <div className="space-y-3">
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-destructive py-6">
        {error instanceof Error
          ? error.message
          : "Failed to load MAVE evidence."}
      </p>
    );
  }

  if (bands.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">
          No MaveDB scores for this variant.
        </p>
        <p className="mt-1">
          MaveDB grows monthly. Open the gene page for adjacent variants covered
          by the same scoresets.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <CountPills
        bands={bands}
        active={activeClass}
        onSelect={setActiveClass}
      />

      <p className="text-xs text-muted-foreground">
        {bands.length} band call
        {bands.length === 1 ? "" : "s"} across{" "}
        {new Set(bands.map((b) => b.scoreset_urn)).size} scoreset
        {new Set(bands.map((b) => b.scoreset_urn)).size === 1 ? "" : "s"}.
        {activeClass && (
          <>
            {" "}
            Showing {filtered.length} {activeClass}.{" "}
            <button
              type="button"
              onClick={() => setActiveClass(null)}
              className="text-primary hover:underline"
            >
              Clear
            </button>
          </>
        )}
      </p>

      <div className="space-y-3">
        {groups.map((g) => (
          <ScoresetCard
            key={g.urn}
            scoresetUrn={g.urn}
            scoresetTitle={g.title}
            publishedDate={g.publishedDate}
            bands={g.bands}
          />
        ))}
      </div>
    </div>
  );
}
