"use client";

import { cn } from "@infra/utils";
import { memo } from "react";
import { getCategoryColor, type PathwayNode } from "./types";

interface PathwayNodeTooltipProps {
  node: PathwayNode | null;
  position: { x: number; y: number } | null;
}

function PathwayNodeTooltipInner({ node, position }: PathwayNodeTooltipProps) {
  if (!node || !position) return null;

  const colors = getCategoryColor(node.category);

  return (
    <div
      className={cn(
        "fixed z-50 bg-white rounded-lg border border-slate-200 shadow-lg p-3 pointer-events-none",
        "max-w-xs",
      )}
      style={{
        left: position.x + 12,
        top: position.y - 12,
        transform: "translateY(-100%)",
      }}
    >
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
  );
}

export const PathwayNodeTooltip = memo(PathwayNodeTooltipInner);
