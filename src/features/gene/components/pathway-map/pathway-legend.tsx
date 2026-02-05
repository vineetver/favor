"use client";

import { memo } from "react";

function PathwayLegendInner() {
  return (
    <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200 shadow-sm p-3">
      <div className="text-xs font-medium text-slate-600 mb-2">Legend</div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-indigo-500 border-2 border-indigo-600" />
          <span className="text-xs text-slate-600">Gene (seed)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-slate-200 border-2 border-slate-400" />
          <span className="text-xs text-slate-600">Pathway</span>
        </div>
      </div>
    </div>
  );
}

export const PathwayLegend = memo(PathwayLegendInner);
