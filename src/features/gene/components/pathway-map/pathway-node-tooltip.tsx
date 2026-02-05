"use client";

import { cn } from "@infra/utils";
import { memo, useEffect, useRef, useState } from "react";
import { getCategoryColor, type PathwayNode } from "./types";

interface PathwayNodeTooltipProps {
  node: PathwayNode | null;
  position: { x: number; y: number } | null;
}

function PathwayNodeTooltipInner({ node, position }: PathwayNodeTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    if (!position || !tooltipRef.current) {
      setAdjustedPosition(null);
      return;
    }

    const tooltip = tooltipRef.current;
    const rect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = position.x - rect.width / 2;
    let y = position.y - rect.height - 16;

    // Adjust horizontal position if overflowing
    if (x < 8) x = 8;
    if (x + rect.width > viewportWidth - 8) x = viewportWidth - rect.width - 8;

    // Flip to below if overflowing top
    if (y < 8) {
      y = position.y + 24;
    }

    // Ensure doesn't overflow bottom
    if (y + rect.height > viewportHeight - 8) {
      y = viewportHeight - rect.height - 8;
    }

    setAdjustedPosition({ x, y });
  }, [position]);

  if (!node || !position) return null;

  const colors = getCategoryColor(node.category);

  return (
    <div
      ref={tooltipRef}
      className={cn(
        "fixed z-50 pointer-events-none transition-opacity duration-150",
        adjustedPosition ? "opacity-100" : "opacity-0",
      )}
      style={{
        left: adjustedPosition?.x ?? position.x,
        top: adjustedPosition?.y ?? position.y,
      }}
    >
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-3 max-w-xs">
        <div className="font-medium text-sm text-slate-900 mb-1">
          {node.name}
        </div>
        <div className="text-xs font-mono text-slate-500 mb-2">{node.id}</div>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ backgroundColor: colors.bg, color: colors.text }}
          >
            {node.category}
          </span>
          <span className="text-xs text-slate-500">
            {node.source === "reactome" ? "Reactome" : "WikiPathways"}
          </span>
        </div>
      </div>
    </div>
  );
}

export const PathwayNodeTooltip = memo(PathwayNodeTooltipInner);
