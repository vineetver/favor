"use client";

import { cn } from "@infra/utils";
import { memo } from "react";
import type { ColorMode } from "./types";

interface PPILegendProps {
  colorMode?: ColorMode;
  className?: string;
}

const CONFIDENCE_ITEMS = [
  { color: "#6366f1", label: "Seed gene", border: "#4f46e5" },
  { color: "#22c55e", label: "High confidence (5+ sources)", border: "#16a34a" },
  { color: "#eab308", label: "Medium (2-4 sources)", border: "#ca8a04" },
  { color: "#94a3b8", label: "Low (1 source)", border: "#64748b" },
] as const;

const HUB_ITEMS = [
  { color: "#6366f1", label: "Seed gene", border: "#4f46e5" },
  { color: "#3b82f6", label: "Low centrality (0-25%)", border: "#2563eb" },
  { color: "#eab308", label: "Medium centrality (25-75%)", border: "#ca8a04" },
  { color: "#dc2626", label: "High centrality (75-100%)", border: "#b91c1c" },
] as const;

function PPILegendInner({ colorMode = "confidence", className }: PPILegendProps) {
  const items = colorMode === "hub" ? HUB_ITEMS : CONFIDENCE_ITEMS;

  return (
    <div
      className={cn(
        "absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200 shadow-sm p-3",
        className,
      )}
    >
      <div className="text-xs font-medium text-slate-600 mb-2">
        {colorMode === "hub" ? "Hub Score Legend" : "Confidence Legend"}
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
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
    </div>
  );
}

export const PPILegend = memo(PPILegendInner);
