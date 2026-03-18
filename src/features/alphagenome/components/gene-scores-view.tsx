"use client";

import { Skeleton } from "@shared/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { Info, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useIntervalScores } from "../hooks/use-interval-scores";
import type { SupportedWidth } from "../types";
import { snapToInterval, widthForGene } from "../utils";
import { ScoresHeatmap } from "./scores-heatmap";

interface AlphaGenomeGeneScoresViewProps {
  geneName: string;
  geneId: string;
  chromosome: string;
  start: number;
  end: number;
}

export function AlphaGenomeGeneScoresView({
  geneName,
  geneId,
  chromosome,
  start,
  end,
}: AlphaGenomeGeneScoresViewProps) {
  const chrLabel = chromosome.startsWith("chr")
    ? chromosome
    : `chr${chromosome}`;

  const MIN_SCORE_WIDTH: SupportedWidth = 524288;
  const scoreWidth = useMemo(() => {
    const geneW = widthForGene(start, end);
    return Math.max(geneW, MIN_SCORE_WIDTH) as SupportedWidth;
  }, [start, end]);
  const center = useMemo(() => Math.floor((start + end) / 2), [start, end]);
  const interval = useMemo(
    () => snapToInterval(center, scoreWidth),
    [center, scoreWidth],
  );

  const regionLabel = `${chrLabel}:${interval.start.toLocaleString()}-${interval.end.toLocaleString()}`;

  const { data, isLoading, error } = useIntervalScores({
    chromosome: chrLabel,
    start: interval.start,
    end: interval.end,
    enabled: true,
  });

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold text-foreground">
          Region Expression Scores
        </h2>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <p>
              Predicted over a {(scoreWidth / 1000).toFixed(0)}kb region (
              {regionLabel}) — the minimum window the model requires, so nearby
              genes are included.
            </p>
          </TooltipContent>
        </Tooltip>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Computing region expression scores...
          </div>
          <p className="text-xs text-muted-foreground">
            First predictions can take 1-10 minutes. Subsequent requests are
            instant.
          </p>
          <ScoresLoadingSkeleton />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load scores"}
        </p>
      )}

      {data && <ScoresHeatmap scorers={data.scorers} />}
    </section>
  );
}

function ScoresLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-3 w-48" />
      <div className="space-y-1">
        <Skeleton className="h-3 w-72" />
        <Skeleton className="h-3 w-64" />
      </div>
      <Skeleton className="h-32 w-full rounded" />
    </div>
  );
}
