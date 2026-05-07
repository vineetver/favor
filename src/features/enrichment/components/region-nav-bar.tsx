"use client";

import type { RegionSummary } from "@features/enrichment/api/region";
import { cn } from "@infra/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { formatCount } from "@shared/utils/tissue-format";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

// ---------------------------------------------------------------------------
// Nav items config — grouped semantically
// ---------------------------------------------------------------------------

interface NavItem {
  key: keyof RegionSummary["counts"] | null;
  /** Additional count keys to sum (e.g., enhancer methods split across multiple fields) */
  alsoCount?: (keyof RegionSummary["counts"])[];
  slug: string;
  label: string;
  hint: string;
  hot?: boolean;
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
        label: "cCRE Activity",
        hint: "cCRE epigenomic signal Z-scores across tissues",
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
        alsoCount: ["epiraction", "epimap", "encode_re2g"],
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
        key: "crispr_screens",
        slug: "perturbation",
        label: "Perturbation",
        hint: "CRISPR essentiality screens, Perturb-seq downstream effects, and MAVE variant scores",
      },
    ],
  },
  {
    label: "AI",
    items: [
      {
        key: null,
        slug: "alphagenome",
        label: "AlphaGenome",
        hint: "AlphaGenome gene-level scores and region track predictions",
        hot: true,
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
  /** Group labels to drop from the rendered nav. */
  hiddenGroupLabels?: string[];
}

export type { NavGroup, NavItem };

export function RegionNavBar({
  summary,
  basePath,
  navGroups,
  hiddenGroupLabels,
}: RegionNavBarProps) {
  const baseGroups = navGroups ?? NAV_GROUPS;
  const groups = hiddenGroupLabels?.length
    ? baseGroups.filter((g) => !hiddenGroupLabels.includes(g.label ?? ""))
    : baseGroups;
  const pathname = usePathname();

  const activeSlug = useMemo(() => {
    const segments = pathname.split("/");
    return segments[segments.length - 1];
  }, [pathname]);

  return (
    <TooltipProvider delayDuration={200}>
      <nav className="mb-6">
        <div className="flex items-center gap-0 flex-wrap border-b border-border">
          {groups.map((group, gi) => (
            <div key={gi} className="flex items-center">
              {group.items.map(({ key, alsoCount, slug, label, hint, hot }) => {
                let count = key ? (summary.counts[key] ?? 0) : null;
                if (count != null && alsoCount) {
                  for (const k of alsoCount) count += summary.counts[k] ?? 0;
                }
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
                              onClick: (e: React.MouseEvent) =>
                                e.preventDefault(),
                            }
                          : {})}
                      >
                        <span>{label}</span>
                        {hot && (
                          <span className="h-1.5 w-1.5 rounded-full bg-gradient-to-br from-orange-400 to-red-500 shrink-0" />
                        )}
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
