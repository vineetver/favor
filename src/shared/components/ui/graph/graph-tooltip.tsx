"use client";

import { cn } from "@infra/utils";
import { memo, useEffect, useState } from "react";

interface GraphTooltipProps {
  /** Position of the tooltip anchor (e.g., node position) */
  position: { x: number; y: number } | null;
  /** Whether the tooltip is visible */
  visible?: boolean;
  /** Offset from anchor position */
  offset?: { x: number; y: number };
  /** Tooltip content */
  children: React.ReactNode;
  /** Additional class name */
  className?: string;
}

/**
 * Shared graph tooltip component.
 * Used by PPI network and pathway map for node hover tooltips.
 * Positioned relative to viewport to handle graph panning/zooming.
 */
function GraphTooltipInner({
  position,
  visible = true,
  offset = { x: 12, y: -12 },
  children,
  className,
}: GraphTooltipProps) {
  const [adjustedPosition, setAdjustedPosition] = useState<{ x: number; y: number } | null>(null);

  // Adjust tooltip position to keep it within viewport
  useEffect(() => {
    if (!position || !visible) {
      setAdjustedPosition(null);
      return;
    }

    const tooltipWidth = 240; // Estimated max width
    const tooltipHeight = 120; // Estimated max height
    const padding = 12;

    let x = position.x + offset.x;
    let y = position.y + offset.y;

    // Adjust if tooltip would go off right edge
    if (x + tooltipWidth > window.innerWidth - padding) {
      x = position.x - tooltipWidth - offset.x;
    }

    // Adjust if tooltip would go off bottom
    if (y + tooltipHeight > window.innerHeight - padding) {
      y = position.y - tooltipHeight - offset.y;
    }

    // Ensure tooltip doesn't go off left or top
    x = Math.max(padding, x);
    y = Math.max(padding, y);

    setAdjustedPosition({ x, y });
  }, [position, visible, offset]);

  if (!visible || !position || !adjustedPosition) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed z-50 pointer-events-none",
        "bg-white rounded-lg border border-slate-200 shadow-lg",
        "px-3 py-2 max-w-[240px]",
        "animate-in fade-in-0 zoom-in-95 duration-100",
        className
      )}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {children}
    </div>
  );
}

export const GraphTooltip = memo(GraphTooltipInner);

/**
 * Tooltip row component for consistent formatting
 */
interface TooltipRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function TooltipRow({ label, value, className }: TooltipRowProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-medium text-slate-900">{value}</span>
    </div>
  );
}

/**
 * Tooltip header component
 */
interface TooltipHeaderProps {
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  className?: string;
}

export function TooltipHeader({ title, subtitle, badge, className }: TooltipHeaderProps) {
  return (
    <div className={cn("mb-2", className)}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-slate-900">{title}</span>
        {badge}
      </div>
      {subtitle && (
        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{subtitle}</div>
      )}
    </div>
  );
}
