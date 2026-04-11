"use client";

// src/features/genome-browser/components/shared/region-display.tsx
// Displays the current genomic region with formatting

import { cn } from "@infra/utils";
import { MapPin } from "lucide-react";
import type { GenomicRegion } from "../../types/state";
import { formatRegion, formatRegionSize } from "../../utils/region-parser";

type RegionDisplayProps = {
  region: GenomicRegion;
  className?: string;
  showIcon?: boolean;
  showSize?: boolean;
};

export function RegionDisplay({
  region,
  className,
  showIcon = true,
  showSize = true,
}: RegionDisplayProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showIcon && <MapPin className="h-4 w-4 text-muted-foreground" />}
      <div className="flex flex-col">
        <span className="text-sm font-medium text-foreground">
          {formatRegion(region)}
        </span>
        {showSize && (
          <span className="text-xs text-muted-foreground">
            {formatRegionSize(region.size)}
          </span>
        )}
      </div>
    </div>
  );
}
