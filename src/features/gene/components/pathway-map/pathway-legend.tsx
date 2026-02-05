"use client";

import { memo } from "react";

function PathwayLegendInner() {
  return (
    <div className="absolute bottom-4 left-4 z-10 bg-background/95 backdrop-blur-sm rounded-lg border border-border shadow-sm p-3">
      <div className="text-xs font-medium text-muted-foreground mb-2">Legend</div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-primary border-2 border-primary" />
          <span className="text-xs text-muted-foreground">Gene (seed)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-muted border-2 border-border" />
          <span className="text-xs text-muted-foreground">Pathway</span>
        </div>
      </div>
    </div>
  );
}

export const PathwayLegend = memo(PathwayLegendInner);
