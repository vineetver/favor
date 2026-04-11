"use client";

import { cn } from "@infra/utils";
import { memo } from "react";

interface LegendItem {
  /** Color of the legend item (hex, rgb, or CSS color name) */
  color: string;
  /** Border color for ring/outline items */
  borderColor?: string;
  /** Label text */
  label: string;
  /** Optional description */
  description?: string;
  /** Item style: filled circle, outline/ring, or line */
  style?: "filled" | "ring" | "line";
}

interface GraphLegendProps {
  /** Legend items to display */
  items: LegendItem[];
  /** Legend title */
  title?: string;
  /** Position of the legend */
  position?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
  /** Orientation of legend items */
  orientation?: "horizontal" | "vertical";
  /** Additional class name */
  className?: string;
}

/**
 * Shared graph legend component.
 * Used by PPI network and pathway map for color/style legends.
 */
function GraphLegendInner({
  items,
  title,
  position = "bottom-left",
  orientation = "vertical",
  className,
}: GraphLegendProps) {
  if (items.length === 0) {
    return null;
  }

  const positionClasses = {
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
  };

  return (
    <div
      className={cn(
        "absolute z-10",
        "bg-background/95 backdrop-blur-sm rounded-lg border border-border shadow-sm",
        "p-3",
        positionClasses[position],
        className,
      )}
    >
      {title && (
        <div className="text-xs font-medium text-foreground mb-2">{title}</div>
      )}
      <div
        className={cn(
          orientation === "horizontal"
            ? "flex flex-wrap items-center gap-4"
            : "space-y-1.5",
        )}
      >
        {items.map((item, index) => (
          <LegendItemRow key={`${item.label}-${index}`} item={item} />
        ))}
      </div>
    </div>
  );
}

interface LegendItemRowProps {
  item: LegendItem;
}

function LegendItemRow({ item }: LegendItemRowProps) {
  const { color, borderColor, label, description, style = "filled" } = item;

  return (
    <div className="flex items-center gap-2">
      {/* Visual indicator */}
      {style === "line" ? (
        <div
          className="w-4 h-0.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : (
        <div
          className={cn(
            "w-3 h-3 rounded-full shrink-0",
            style === "ring" && "border-2",
          )}
          style={{
            backgroundColor:
              style === "filled" ? color : borderColor ? color : "transparent",
            borderColor: borderColor ?? color,
          }}
        />
      )}

      {/* Label and description */}
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        {description && (
          <span className="text-[10px] text-muted-foreground/70">
            {description}
          </span>
        )}
      </div>
    </div>
  );
}

export const GraphLegend = memo(GraphLegendInner);

/**
 * Preset color palettes for common use cases
 */
export const LEGEND_PALETTES = {
  // Experiment count levels
  experiments: [
    {
      color: "#dcfce7",
      borderColor: "#22c55e",
      label: "High (51+)",
      style: "ring" as const,
    },
    {
      color: "#dbeafe",
      borderColor: "#3b82f6",
      label: "Good (21-50)",
      style: "ring" as const,
    },
    {
      color: "#fef3c7",
      borderColor: "#f59e0b",
      label: "Moderate (6-20)",
      style: "ring" as const,
    },
    {
      color: "#f1f5f9",
      borderColor: "#94a3b8",
      label: "Low (0-5)",
      style: "ring" as const,
    },
  ],
  // Hub score levels
  hubScore: [
    {
      color: "#fef2f2",
      borderColor: "#ef4444",
      label: "Top 1%",
      style: "ring" as const,
    },
    {
      color: "#fef3c7",
      borderColor: "#f59e0b",
      label: "Top 10%",
      style: "ring" as const,
    },
    {
      color: "#dcfce7",
      borderColor: "#22c55e",
      label: "Top 25%",
      style: "ring" as const,
    },
    {
      color: "#f1f5f9",
      borderColor: "#94a3b8",
      label: "Other",
      style: "ring" as const,
    },
  ],
  // Edge confidence
  edgeConfidence: [
    { color: "#1e40af", label: "4 sources", style: "line" as const },
    { color: "#3b82f6", label: "3 sources", style: "line" as const },
    { color: "#60a5fa", label: "2 sources", style: "line" as const },
    { color: "#cbd5e1", label: "1 source", style: "line" as const },
  ],
};
