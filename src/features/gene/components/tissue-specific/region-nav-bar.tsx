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
import { Info } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

// ---------------------------------------------------------------------------
// Nav items config
// ---------------------------------------------------------------------------

const NAV_ITEMS: {
  key: keyof RegionSummary["counts"] | null;
  slug: string;
  label: string;
  hint: string;
}[] = [
  {
    key: null,
    slug: "overview",
    label: "Overview",
    hint: "Tissue evidence ranked by convergence across all data types",
  },
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
    hint: "Enhancer-gene predictions (ABC, EPIraction, EpiMap, RE2G)",
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
  {
    key: "validated_enhancers",
    slug: "validated-enhancers",
    label: "VISTA",
    hint: "In vivo validated enhancers from VISTA",
  },
  {
    key: null,
    slug: "ccre-links",
    label: "cCRE Links",
    hint: "cCRE-gene linkages from ChIA-PET, CRISPR, ENCODE SCREEN",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface RegionNavBarProps {
  summary: RegionSummary;
  basePath: string;
}

export function RegionNavBar({ summary, basePath }: RegionNavBarProps) {
  const pathname = usePathname();

  const activeSlug = useMemo(() => {
    const segments = pathname.split("/");
    return segments[segments.length - 1];
  }, [pathname]);

  return (
    <TooltipProvider delayDuration={200}>
      <nav className="mb-6">
        <div className="flex items-center gap-1 flex-wrap">
          {NAV_ITEMS.map(({ key, slug, label, hint }) => {
            const count = key ? summary.counts[key] : null;
            const isActive = activeSlug === slug;
            const isEmpty = key != null && count === 0;

            return (
              <Tooltip key={slug}>
                <TooltipTrigger asChild>
                  <Link
                    href={`${basePath}/${slug}`}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-foreground font-medium"
                        : isEmpty
                          ? "text-muted-foreground/40 cursor-default"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                    {...(isEmpty
                      ? {
                          tabIndex: -1,
                          "aria-disabled": true,
                          onClick: (e: React.MouseEvent) => e.preventDefault(),
                        }
                      : {})}
                  >
                    {count != null && (
                      <span className="tabular-nums font-semibold">
                        {formatCount(count)}
                      </span>
                    )}
                    <span>{label}</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs max-w-xs">
                  {hint}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </nav>
    </TooltipProvider>
  );
}
