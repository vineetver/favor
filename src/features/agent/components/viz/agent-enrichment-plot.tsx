"use client";

import { memo, useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EnrichmentVizSpec } from "../../viz/types";

interface ChartRow {
  id: string;
  label: string;
  negLogAdjP: number;
  foldEnrichment: number;
  overlap: number;
  overlappingGenes: string[];
}

function EnrichmentTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartRow }>;
}) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-foreground mb-1">{d.label}</p>
      <p className="text-muted-foreground">
        -log10(adj.P) = {d.negLogAdjP.toFixed(2)}
      </p>
      <p className="text-muted-foreground">
        Fold enrichment: {d.foldEnrichment.toFixed(1)}x
      </p>
      <p className="text-muted-foreground">Overlap: {d.overlap} genes</p>
      {d.overlappingGenes.length > 0 && (
        <p className="text-muted-foreground mt-1 max-w-[200px] truncate">
          {d.overlappingGenes.join(", ")}
        </p>
      )}
    </div>
  );
}

// Stable tooltip ref — defined outside component to avoid re-creation on every render
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EnrichmentTooltipContent({ active, payload }: { active?: boolean; payload?: readonly any[] }) {
  return <EnrichmentTooltip active={active} payload={payload as Array<{ payload: ChartRow }>} />;
}

export const AgentEnrichmentPlot = memo(function AgentEnrichmentPlot({ spec }: { spec: EnrichmentVizSpec }) {
  const chartData = useMemo<ChartRow[]>(
    () =>
      [...spec.data]
        .sort((a, b) => b.negLogAdjP - a.negLogAdjP)
        .map((d) => ({
          ...d,
          // Truncate long labels for y-axis
          label: d.label.length > 40 ? d.label.slice(0, 37) + "..." : d.label,
        })),
    [spec.data],
  );

  // Cap height to prevent overflow; parent scrolls if needed
  const chartHeight = Math.min(480, Math.max(300, chartData.length * 32));

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <RechartsBarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 4, right: 40, left: 20, bottom: 4 }}
        barCategoryGap="20%"
      >
        <CartesianGrid strokeDasharray="3 3" horizontal stroke="#e2e8f0" />
        <XAxis
          type="number"
          domain={[0, "auto"]}
          tick={{ fontSize: 11, fill: "#64748b" }}
          label={{
            value: "-log10(adj. p-value)",
            position: "insideBottom",
            offset: -2,
            fontSize: 11,
            fill: "#64748b",
          }}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={180}
          tick={{ fontSize: 11, fill: "#334155" }}
        />
        <Tooltip content={EnrichmentTooltipContent} />
        <Bar
          dataKey="negLogAdjP"
          fill="#8b5cf6"
          radius={[0, 4, 4, 0]}
          barSize={18}
        />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
});
