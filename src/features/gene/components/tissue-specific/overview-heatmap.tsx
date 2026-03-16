"use client";

import { SignalHeatmap } from "./signal-heatmap";

interface OverviewHeatmapProps {
  loc: string;
}

export function OverviewHeatmap({ loc }: OverviewHeatmapProps) {
  return (
    <div>
      <div className="mb-3">
        <h3 className="text-sm font-medium text-foreground">
          Regulatory Element Activity
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Epigenomic signal Z-scores at the top cCREs near this gene. Click a
          tissue row to filter the signals detail view.
        </p>
      </div>
      <SignalHeatmap loc={loc} />
    </div>
  );
}
