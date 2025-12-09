"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { VisualizationProps } from "@/lib/table/column-builder";
import { ChartTooltip } from "@/components/common/chart-tooltip";
import {
  REGULATORY_STATE_MAP,
  regulatoryStateCategories,
  type RegulatoryState,
} from "../../config/hg38/columns/epigenetics";

// Chart colors that match our badge colors (using the 400 shade for visibility)
// These match the category colors: emerald, rose, sky
const CHART_COLORS: Record<string, string> = {
  Active: "#34d399",      // emerald-400
  Repressed: "#fb7185",   // rose-400
  Transcription: "#38bdf8", // sky-400
};

/**
 * Get the regulatory state for a column ID
 */
function getRegulatoryState(id: string): RegulatoryState {
  return REGULATORY_STATE_MAP[id] ?? null;
}

/**
 * Get color based on regulatory state
 */
function getStateColor(state: RegulatoryState): string {
  if (!state) return "#94a3b8"; // gray for no state
  return CHART_COLORS[state] ?? "#94a3b8";
}

/**
 * Custom tooltip for the bar chart
 */
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; value: number; state: RegulatoryState } }>;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <ChartTooltip active={active} payload={payload}>
      <div className="space-y-1">
        <div className="font-medium">{data.label}</div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Score:</span>
          <span className="font-mono">{data.value?.toFixed(3) ?? "—"}</span>
        </div>
        {data.state && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Regulatory State:</span>
            <span
              className="font-medium px-1.5 py-0.5 rounded text-xs"
              style={{ backgroundColor: getStateColor(data.state), color: "white" }}
            >
              {data.state}
            </span>
          </div>
        )}
      </div>
    </ChartTooltip>
  );
}

// IDs to exclude from chart (different scales)
const EXCLUDED_IDS = new Set(["gc", "cpg", "encodetotal_rna_sum"]);

/**
 * Bar chart visualization for epigenetics scores.
 * Bars are colored by regulatory state (Active, Repressed, Transcription).
 */
export function EpigeneticsChart({ data }: VisualizationProps) {
  // Transform data for Recharts, filter out different-scale metrics
  const chartData = data
    .filter((row) => row.value !== null && row.value !== undefined && !EXCLUDED_IDS.has(row.id))
    .map((row) => {
      const state = getRegulatoryState(row.id);
      return {
        id: row.id,
        label: row.label,
        value: typeof row.value === "number" ? row.value : parseFloat(String(row.value)) || 0,
        state,
      };
    })
    // Sort by value only (descending)
    .sort((a, b) => b.value - a.value);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No data available for visualization
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <span className="text-muted-foreground">Regulatory State:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: CHART_COLORS.Active }} />
          <span>Active</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: CHART_COLORS.Repressed }} />
          <span>Repressed</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: CHART_COLORS.Transcription }} />
          <span>Transcription</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-400" />
          <span>Other</span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={Math.max(400, chartData.length * 38)}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 40, left: 20, bottom: 10 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis
            type="number"
            domain={[0, "auto"]}
            tickFormatter={(value) => value.toFixed(1)}
          />
          <YAxis
            type="category"
            dataKey="label"
            width={180}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
            {chartData.map((entry) => (
              <Cell key={entry.id} fill={getStateColor(entry.state)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
