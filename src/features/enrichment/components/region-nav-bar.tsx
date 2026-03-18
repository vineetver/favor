"use client";

import { cn } from "@infra/utils";
import type { RegionSummary } from "@features/enrichment/api/region";
import { formatCount } from "@shared/utils/tissue-format";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

// ---------------------------------------------------------------------------
// Nav items config — grouped semantically
// ---------------------------------------------------------------------------

interface NavItem {
  key: keyof RegionSummary["counts"] | null;
  slug: string;
  label: string;
  hint: string;
}

interface NavGroup {
  label: string | null;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: null,
    items: [
      {
        key: null,
        slug: "overview",
        label: "Overview",
        hint: "Tissue evidence ranked by convergence across all data types",
      },
    ],
  },
  {
    label: "Epigenome",
    items: [
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
        key: "accessibility_peaks",
        slug: "accessibility",
        label: "Peaks",
        hint: "ATAC-seq / DNase accessibility peaks",
      },
    ],
  },
  {
    label: "Regulation",
    items: [
      {
        key: "enhancer_genes",
        slug: "enhancer-genes",
        label: "Enhancers",
        hint: "Enhancer-gene predictions (ABC, EPIraction, EpiMap, RE2G)",
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
    ],
  },
  {
    label: "Variants",
    items: [
      {
        key: "qtls",
        slug: "qtls",
        label: "QTLs",
        hint: "eQTL/sQTL associations for variants in this region (GTEx, eQTL Catalogue, single-cell)",
      },
      {
        key: "chrombpnet",
        slug: "chrombpnet",
        label: "ChromBPNet",
        hint: "Deep learning predictions of variant effects on chromatin accessibility",
      },
      {
        key: "tissue_scores",
        slug: "tissue-scores",
        label: "V2F Scores",
        hint: "Tissue-specific variant functional scores: TLand (regulatory effect) and cV2F (variant-to-function probability)",
      },
    ],
  },
  {
    label: "Perturbation",
    items: [
      {
        key: null,
        slug: "perturbation",
        label: "Perturbation",
        hint: "CRISPR essentiality screens, Perturb-seq downstream effects, and MAVE variant scores",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Component — grouped tab bar with semantic separators
// ---------------------------------------------------------------------------

interface RegionNavBarProps {
  summary: RegionSummary;
  basePath: string;
  navGroups?: NavGroup[];
}

export type { NavGroup, NavItem };

export function RegionNavBar({ summary, basePath, navGroups }: RegionNavBarProps) {
  const groups = navGroups ?? NAV_GROUPS;
  const pathname = usePathname();

  const activeSlug = useMemo(() => {
    const segments = pathname.split("/");
    return segments[segments.length - 1];
  }, [pathname]);

  return (
    <TooltipProvider delayDuration={200}>
      <nav className="mb-6">
        <div className="flex items-center gap-0 overflow-x-auto border-b border-border">
          {groups.map((group, gi) => (
            <div key={gi} className="flex items-center">
              {/* Thin divider between groups */}
              {gi > 0 && (
                <span className="w-px h-4 bg-border mx-1 shrink-0" />
              )}

              {/* Tab items */}
              {group.items.map(({ key, slug, label, hint }) => {
                const count = key ? summary.counts[key] : null;
                const isActive = activeSlug === slug;
                const isEmpty = key != null && count === 0;

                return (
                  <Tooltip key={slug}>
                    <TooltipTrigger asChild>
                      <Link
                        href={`${basePath}/${slug}`}
                        className={cn(
                          "relative inline-flex items-center gap-1 px-2 py-2.5 text-xs whitespace-nowrap transition-colors",
                          isActive
                            ? "text-foreground font-medium"
                            : isEmpty
                              ? "text-muted-foreground/30 cursor-default"
                              : "text-muted-foreground hover:text-foreground",
                        )}
                        {...(isEmpty
                          ? {
                              tabIndex: -1,
                              "aria-disabled": true,
                              onClick: (e: React.MouseEvent) => e.preventDefault(),
                            }
                          : {})}
                      >
                        <span>{label}</span>
                        {count != null && count > 0 && (
                          <span
                            className={cn(
                              "tabular-nums",
                              isActive
                                ? "text-primary font-semibold"
                                : "text-muted-foreground/50",
                            )}
                          >
                            {formatCount(count)}
                          </span>
                        )}
                        {/* Active indicator */}
                        {isActive && (
                          <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
                        )}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs max-w-xs">
                      {hint}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
      </nav>
    </TooltipProvider>
  );
}
