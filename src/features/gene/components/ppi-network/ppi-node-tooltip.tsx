"use client";

import { cn } from "@infra/utils";
import { memo } from "react";
import type { PPINodeTooltipProps } from "./types";

function PPINodeTooltipInner({ node, position }: PPINodeTooltipProps) {
  if (!node || !position) return null;

  return (
    <div
      className={cn(
        "fixed z-50 bg-background rounded-lg border border-border shadow-lg p-3 pointer-events-none",
        "min-w-[180px] max-w-[260px]",
      )}
      style={{
        left: position.x + 12,
        top: position.y - 12,
        transform: "translateY(-100%)",
      }}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">
            {node.label}
          </span>
          {node.isSeed && (
            <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
              Seed
            </span>
          )}
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between text-muted-foreground">
            <span>ID:</span>
            <span className="font-mono text-foreground">{node.id}</span>
          </div>
          {!node.isSeed && (
            <>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Sources:</span>
                <span className="font-medium text-foreground">
                  {node.numSources ?? "N/A"}
                </span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Experiments:</span>
                <span className="font-medium text-foreground">
                  {node.numExperiments ?? "N/A"}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export const PPINodeTooltip = memo(PPINodeTooltipInner);
