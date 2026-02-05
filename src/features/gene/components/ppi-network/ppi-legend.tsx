"use client";

import { cn } from "@infra/utils";
import { memo } from "react";
import type { ColorMode } from "./types";

interface PPILegendProps {
  colorMode?: ColorMode;
  className?: string;
}

// Experiment mode legend items (node colors by experiment count)
// Warm color family: orange→amber→yellow for natural hierarchy
const EXPERIMENT_LEGEND_ITEMS = [
  { color: "#6366f1", label: "Seed gene", border: "#4f46e5" },
  { color: "#f97316", label: "51+ experiments", border: "#ea580c" },
  { color: "#fcd34d", label: "21-50 experiments", border: "#fbbf24" },
  { color: "#fef3c7", label: "6-20 experiments", border: "#fcd34d" },
  { color: "#e2e8f0", label: "0-5 experiments", border: "#cbd5e1" },
] as const;

// Hub mode legend items
const HUB_ITEMS = [
  { color: "#6366f1", label: "Seed gene", border: "#4f46e5" },
  { color: "#3b82f6", label: "Low centrality (0-25%)", border: "#2563eb" },
  { color: "#eab308", label: "Medium centrality (25-75%)", border: "#ca8a04" },
  { color: "#dc2626", label: "High centrality (75-100%)", border: "#b91c1c" },
] as const;

// Edge legend items (by source count)
const EDGE_LEGEND_ITEMS = [
  { width: 4, color: "#475569", label: "4 sources" },
  { width: 3, color: "#64748b", label: "3 sources" },
  { width: 2, color: "#94a3b8", label: "2 sources" },
  { width: 1, color: "#cbd5e1", label: "1 source" },
] as const;

function PPILegendInner({ colorMode = "experiments", className }: PPILegendProps) {
  const nodeItems = colorMode === "hub" ? HUB_ITEMS : EXPERIMENT_LEGEND_ITEMS;

  return (
    <div
      className={cn(
        "absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200 shadow-sm p-3",
        className,
      )}
    >
      {/* Node Legend */}
      <div className="text-xs font-medium text-slate-600 mb-2">
        {colorMode === "hub" ? "Hub Score" : "Nodes (Experiments)"}
      </div>
      <div className="space-y-1.5">
        {nodeItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{
                backgroundColor: item.color,
                border: `2px solid ${item.border}`,
              }}
            />
            <span className="text-xs text-slate-600">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Edge Legend */}
      <div className="text-xs font-medium text-slate-600 mt-3 mb-2">
        Edges (Sources)
      </div>
      <div className="space-y-1.5">
        {EDGE_LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div
              className="shrink-0"
              style={{
                width: 20,
                height: item.width,
                backgroundColor: item.color,
                borderRadius: 1,
              }}
            />
            <span className="text-xs text-slate-600">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const PPILegend = memo(PPILegendInner);
