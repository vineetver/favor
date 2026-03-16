"use client";

import { cn } from "@infra/utils";
import type { RegionSummary } from "@features/enrichment/api/region";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { Info } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

interface RegionSummaryNavProps {
  summary: RegionSummary;
  basePath: string;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const NAV_ITEMS: {
  key: keyof RegionSummary["counts"] | null;
  slug: string;
  label: string;
  hint: string;
  isOverview?: boolean;
}[] = [
  { key: null, slug: "overview", label: "Overview", hint: "Tissue evidence ranked by convergence across all data types", isOverview: true },
  { key: "signals", slug: "tissue-signals", label: "Tissue Signals", hint: "cCRE epigenomic signal values across tissues" },
  { key: "chromatin_states", slug: "chromatin-states", label: "Chromatin States", hint: "Roadmap 25-state chromatin annotations" },
  { key: "enhancer_genes", slug: "enhancer-genes", label: "Enhancer-Genes", hint: "Enhancer-gene predictions (ABC, EPIraction, EpiMap, RE2G)" },
  { key: "accessibility_peaks", slug: "accessibility", label: "ATAC Peaks", hint: "ATAC-seq / DNase accessibility peaks" },
  { key: "loops", slug: "loops", label: "Chromatin Loops", hint: "Two-anchor loops from Hi-C / ChIA-PET" },
  { key: "ase", slug: "allele-specific", label: "ASE cCREs", hint: "Allele-specific epigenomic activity at cCREs" },
  { key: "validated_enhancers", slug: "validated-enhancers", label: "VISTA Enhancers", hint: "In vivo validated enhancers from VISTA" },
  { key: null, slug: "ccre-links", label: "cCRE Links", hint: "cCRE-gene linkages from ChIA-PET, CRISPR, ENCODE SCREEN" },
];

export function RegionSummaryNav({ summary, basePath }: RegionSummaryNavProps) {
  const pathname = usePathname();

  const activeSlug = useMemo(() => {
    const segments = pathname.split("/");
    return segments[segments.length - 1];
  }, [pathname]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="mb-6">
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3">
          {NAV_ITEMS.map(({ key, slug, label, hint, isOverview }) => {
            const count = key ? summary.counts[key] : null;
            const isActive = activeSlug === slug;
            const isEmpty = !isOverview && count === 0;

            return (
              <Link
                key={slug}
                href={`${basePath}/${slug}`}
                className={cn(
                  "rounded-lg border p-4 transition-colors",
                  isActive
                    ? "bg-primary/10 border-primary/30"
                    : isEmpty
                      ? "bg-card border-border opacity-40 cursor-default"
                      : "bg-card border-border hover:bg-accent",
                )}
                {...(isEmpty ? { tabIndex: -1, "aria-disabled": true, onClick: (e: React.MouseEvent) => e.preventDefault() } : {})}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-sm">
                      {hint}
                    </TooltipContent>
                  </Tooltip>
                </div>
                {isOverview ? (
                  <span className={cn(
                    "text-sm font-medium",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}>
                    Evidence
                  </span>
                ) : (
                  <span
                    className={cn(
                      "text-2xl font-semibold tabular-nums tracking-tight",
                      isActive ? "text-foreground" : "text-foreground",
                    )}
                  >
                    {count != null ? formatCount(count) : "\u2014"}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
