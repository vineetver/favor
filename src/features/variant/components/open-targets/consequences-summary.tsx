"use client";

import { useMemo } from "react";
import { ProgressBar } from "./summary-card";
import type { OpenTargetsConsequenceRow } from "../../types/opentargets";

interface ConsequencesSummaryProps {
  data: OpenTargetsConsequenceRow[];
}

export function ConsequencesSummary({ data }: ConsequencesSummaryProps) {
  const stats = useMemo(() => {
    const impactCounts = { HIGH: 0, MODERATE: 0, LOW: 0, MODIFIER: 0 };

    for (const row of data) {
      if (row.impact && row.impact in impactCounts) {
        impactCounts[row.impact as keyof typeof impactCounts]++;
      }
    }

    return {
      total: data.length,
      impactCounts,
    };
  }, [data]);

  if (data.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="rounded-lg border border-border/50 p-4 space-y-3">
        <h4 className="text-sm font-medium">Impact Distribution (VEP)</h4>
        <p className="text-sm text-muted-foreground">
          Functional impact classification by Ensembl Variant Effect Predictor
        </p>
        <div className="space-y-2 mt-3">
          <ProgressBar
            label="HIGH"
            value={stats.impactCounts.HIGH}
            total={stats.total}
            color="red"
          />
          <ProgressBar
            label="MODERATE"
            value={stats.impactCounts.MODERATE}
            total={stats.total}
            color="orange"
          />
          <ProgressBar
            label="LOW"
            value={stats.impactCounts.LOW}
            total={stats.total}
            color="amber"
          />
          <ProgressBar
            label="MODIFIER"
            value={stats.impactCounts.MODIFIER}
            total={stats.total}
            color="gray"
          />
        </div>
      </div>
    </div>
  );
}
