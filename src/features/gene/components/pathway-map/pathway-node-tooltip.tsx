"use client";

import { cn } from "@infra/utils";
import { Beaker, Database } from "lucide-react";
import { memo } from "react";
import { getCategoryColor, type PathwayNode } from "./types";

interface PathwayNodeTooltipProps {
  node: PathwayNode | null;
  position: { x: number; y: number } | null;
}

function PathwayNodeTooltipInner({ node, position }: PathwayNodeTooltipProps) {
  if (!node || !position) return null;

  const colors = getCategoryColor(node.category);
  const hasEvidence = node.numSources || node.numExperiments;

  return (
    <div
      className={cn(
        "fixed z-50 bg-card rounded-lg border border-border shadow-lg p-3 pointer-events-none",
        "max-w-xs",
      )}
      style={{
        left: position.x + 12,
        top: position.y - 12,
        transform: "translateY(-100%)",
      }}
    >
      <div className="font-medium text-sm text-foreground mb-1">
        {node.name}
      </div>
      <div className="text-xs font-mono text-muted-foreground mb-2">
        {node.id}
      </div>

      {/* Evidence badges */}
      {hasEvidence && (
        <div className="flex items-center gap-2 mb-2">
          {node.numSources && node.numSources > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-xs">
              <Database className="w-3 h-3" />
              {node.numSources} source{node.numSources > 1 ? "s" : ""}
            </span>
          )}
          {node.numExperiments && node.numExperiments > 0 && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs">
              <Beaker className="w-3 h-3" />
              {node.numExperiments} exp{node.numExperiments > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          {node.source}
        </span>
      </div>
    </div>
  );
}

export const PathwayNodeTooltip = memo(PathwayNodeTooltipInner);
