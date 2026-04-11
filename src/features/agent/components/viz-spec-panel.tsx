"use client";

import { lazy, memo, Suspense } from "react";
import type { VizSpec } from "../viz/types";
import { AgentBarChart } from "./viz/agent-bar-chart";
import { AgentComparison } from "./viz/agent-comparison";
import { AgentDistribution } from "./viz/agent-distribution";
import { AgentEnrichmentPlot } from "./viz/agent-enrichment-plot";
import { AgentHeatmap } from "./viz/agent-heatmap";
import { AgentQQPlot } from "./viz/agent-qq-plot";
import { AgentScatterPlot } from "./viz/agent-scatter-plot";
import { AgentStatCard } from "./viz/agent-stat-card";

// Lazy-load heavy renderers
const AgentMiniNetwork = lazy(() =>
  import("./viz/agent-mini-network").then((m) => ({
    default: m.AgentMiniNetwork,
  })),
);

const AgentProteinStructure = lazy(() =>
  import("./viz/agent-protein-structure").then((m) => ({
    default: m.AgentProteinStructure,
  })),
);

function VizSpecRenderer({ spec }: { spec: VizSpec }) {
  switch (spec.type) {
    case "bar_chart":
      return <AgentBarChart spec={spec} />;
    case "enrichment_plot":
      return <AgentEnrichmentPlot spec={spec} />;
    case "network":
      return (
        <Suspense
          fallback={
            <div className="h-[300px] w-full rounded-md border border-border bg-muted animate-pulse" />
          }
        >
          <AgentMiniNetwork spec={spec} />
        </Suspense>
      );
    case "stat_card":
      return <AgentStatCard spec={spec} />;
    case "distribution":
      return <AgentDistribution spec={spec} />;
    case "comparison":
      return <AgentComparison spec={spec} />;
    case "scatter_plot":
      return <AgentScatterPlot spec={spec} />;
    case "qq_plot":
      return <AgentQQPlot spec={spec} />;
    case "heatmap":
      return <AgentHeatmap spec={spec} />;
    case "protein_structure":
      return (
        <Suspense
          fallback={
            <div className="h-[300px] w-full rounded-md border border-border bg-muted animate-pulse" />
          }
        >
          <AgentProteinStructure spec={spec} />
        </Suspense>
      );
    default:
      return null;
  }
}

export const VizSpecPanel = memo(function VizSpecPanel({
  vizSpecs,
}: {
  vizSpecs: VizSpec[];
}) {
  if (!vizSpecs.length) return null;

  return (
    <div className="space-y-3">
      {vizSpecs.map((spec, i) => (
        <div
          key={`${spec.type}-${spec.toolCallIndex}-${i}`}
          className="rounded-lg border border-border bg-card p-3 overflow-hidden"
        >
          <p className="text-xs font-medium text-foreground mb-2">
            {spec.title}
          </p>
          <div className="max-h-[500px] overflow-y-auto">
            <VizSpecRenderer spec={spec} />
          </div>
        </div>
      ))}
    </div>
  );
});
