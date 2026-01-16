"use client";

import { useMemo } from "react";
import type { OpenTargetsVariantEffectRow } from "../../types/opentargets";

interface PathogenicitySummaryProps {
  data: OpenTargetsVariantEffectRow[];
}

export function PathogenicitySummary({ data }: PathogenicitySummaryProps) {
  const avgNormalisedScore = useMemo(() => {
    let totalNormalisedScore = 0;
    let normalisedScoreCount = 0;

    for (const row of data) {
      if (row.normalisedScore !== null) {
        totalNormalisedScore += row.normalisedScore;
        normalisedScoreCount++;
      }
    }

    return normalisedScoreCount > 0 ? totalNormalisedScore / normalisedScoreCount : null;
  }, [data]);

  if (data.length === 0 || avgNormalisedScore === null) return null;

  return (
    <div className="mb-6">
      <div className="rounded-lg border border-border/50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-base font-semibold">Average Normalised Score</h4>
            <p className="text-base text-muted-foreground">
              Cross-method normalized pathogenicity score (0-1 scale)
            </p>
          </div>
          <div className="text-2xl font-bold">
            {avgNormalisedScore.toFixed(3)}
          </div>
        </div>
        <div className="mt-3 h-3 bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500 rounded-full relative">
          <div
            className="absolute top-0 w-3 h-3 bg-white border-2 border-foreground rounded-full transform -translate-x-1/2"
            style={{ left: `${avgNormalisedScore * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-caption mt-1">
          <span>Benign (0)</span>
          <span>Pathogenic (1)</span>
        </div>
      </div>
    </div>
  );
}
