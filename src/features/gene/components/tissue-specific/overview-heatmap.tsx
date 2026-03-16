"use client";

import { SignalHeatmap } from "./signal-heatmap";

interface OverviewHeatmapProps {
  loc: string;
}

export function OverviewHeatmap({ loc }: OverviewHeatmapProps) {
  return <SignalHeatmap loc={loc} />;
}
