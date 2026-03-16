"use client";

import { cn } from "@infra/utils";
import type { RegionSummary } from "@features/gene/api/region";
import { formatCount } from "@shared/utils/tissue-format";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const ITEMS: {
  key: keyof RegionSummary["counts"];
  slug: string;
  label: string;
  hint: string;
}[] = [
  {
    key: "signals",
    slug: "tissue-signals",
    label: "Signals",
    hint: "cCRE epigenomic signal values across tissues",
  },
  {
    key: "chromatin_states",
    slug: "chromatin-states",
    label: "Chromatin",
    hint: "Roadmap 25-state chromatin annotations",
  },
  {
    key: "enhancer_genes",
    slug: "enhancer-genes",
    label: "Enhancers",
    hint: "Enhancer-gene link predictions (ABC, EPIraction, EpiMap, RE2G)",
  },
  {
    key: "accessibility_peaks",
    slug: "accessibility",
    label: "Peaks",
    hint: "ATAC-seq / DNase accessibility peaks",
  },
  {
    key: "loops",
    slug: "loops",
    label: "Loops",
    hint: "Chromatin loops from Hi-C / ChIA-PET",
  },
  {
    key: "ase",
    slug: "allele-specific",
    label: "Allelic Imbal.",
    hint: "Allele-specific epigenomic activity at cCREs",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface RegionContextBarProps {
  summary: RegionSummary;
  basePath: string;
  currentSlug: string;
}

export function RegionContextBar({
  summary,
  basePath,
  currentSlug,
}: RegionContextBarProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1 flex-wrap text-xs">
        <span className="text-muted-foreground mr-1">Also in this region:</span>
        {ITEMS.map(({ key, slug, label, hint }) => {
          const count = summary.counts[key];
          if (count === 0) return null;
          const isCurrent = slug === currentSlug;

          return (
            <Tooltip key={slug}>
              <TooltipTrigger asChild>
                {isCurrent ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-foreground font-medium">
                    <span className="tabular-nums">{formatCount(count)}</span>
                    {label}
                  </span>
                ) : (
                  <Link
                    href={`${basePath}/${slug}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                  >
                    <span className="tabular-nums">{formatCount(count)}</span>
                    {label}
                  </Link>
                )}
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-xs">
                {hint}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
