"use client";

import { DimensionSelector } from "./dimension-selector";
import type { DimensionConfig } from "./types";

interface ScopeBarProps {
  dimensions: DimensionConfig[];
}

export function ScopeBar({ dimensions }: ScopeBarProps) {
  if (!dimensions || dimensions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-4 px-6 py-3 border-b border-slate-100 bg-slate-50/50">
      {dimensions.map((dim, index) => (
        <div key={`${dim.label}-${index}`} className="flex items-center gap-4">
          {index > 0 && <div className="h-5 w-px bg-slate-200" />}
          <DimensionSelector
            label={dim.label}
            options={dim.options}
            value={dim.value}
            onChange={dim.onChange}
            presentation={dim.presentation}
          />
        </div>
      ))}
    </div>
  );
}
