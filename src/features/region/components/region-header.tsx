"use client";

import type { ParsedRegion } from "../utils/parse-region";
import { formatRegionSize } from "../utils/parse-region";
import { Button } from "@shared/components/ui/button";
import { Share2 } from "lucide-react";

interface RegionHeaderProps {
  region: ParsedRegion;
  genome?: "hg38" | "hg19";
}

export function RegionHeader({ region, genome = "hg38" }: RegionHeaderProps) {
  const size = formatRegionSize(region.start, region.end);

  return (
    <div className="py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {genome.toUpperCase()}
        </span>
        <span className="text-border">&middot;</span>
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Region
        </span>
      </div>

      {/* Main Row */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        {/* Left */}
        <div className="space-y-4">
          <div className="flex items-baseline gap-3 flex-wrap">
            <h1 className="text-page-title font-mono">
              {region.chromosome}-{region.start}-{region.end}
            </h1>
          </div>

          <div className="flex items-center gap-4 flex-wrap text-sm">
            <span className="px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium">
              {size}
            </span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" aria-label="Share region">
            <Share2 className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
