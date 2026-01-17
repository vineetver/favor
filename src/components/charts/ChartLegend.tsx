import { cn } from "@/lib/utils";
import type { ChartLegendProps } from "./types";

/**
 * Horizontal legend component for charts.
 * Displays color dots with labels.
 */
export function ChartLegend({ items, title, className }: ChartLegendProps) {
  if (items.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-4 text-xs text-slate-600", className)}>
      {title && <span className="font-medium">{title}</span>}
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: item.color }}
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
