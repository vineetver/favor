"use client";

import type { Gene } from "@features/gene/types";
import { cn } from "@infra/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { NoDataState } from "@shared/components/ui/error-states";
import { ScopeBar } from "@shared/components/ui/data-surface/scope-bar";
import type { DimensionConfig } from "@shared/components/ui/data-surface/types";
import { ExternalLink } from "@shared/components/ui/external-link";
import { useMemo, useState } from "react";

interface CancerHallmarksOverviewProps {
  hallmarks?: Gene["opentargets"]["hallmarks"]["cancerHallmarks"] | null;
  geneSymbol?: string | null;
  className?: string;
}

type HallmarkEvidence = NonNullable<
  Gene["opentargets"]["hallmarks"]["cancerHallmarks"]
>[number];

type ImpactKey = "promotes" | "suppresses" | "unknown";

const IMPACT_META: Record<ImpactKey, { label: string; chip: string }> = {
  promotes: {
    label: "Promotes",
    chip: "bg-rose-50 text-rose-700 border-rose-200",
  },
  suppresses: {
    label: "Suppresses",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  unknown: {
    label: "Unknown",
    chip: "bg-slate-50 text-slate-600 border-slate-200",
  },
};


function normalizeImpact(impact?: string | null): ImpactKey {
  if (!impact) return "unknown";

  const normalized = impact.toLowerCase();

  if (
    normalized.includes("promot") ||
    normalized.includes("increase") ||
    normalized.includes("enhance") ||
    normalized.includes("activate")
  ) {
    return "promotes";
  }

  if (
    normalized.includes("suppress") ||
    normalized.includes("decrease") ||
    normalized.includes("reduce") ||
    normalized.includes("inhibit")
  ) {
    return "suppresses";
  }

  return "unknown";
}

function getEvidenceKey(label: string, item: HallmarkEvidence, index: number) {
  return `${label}::${item.pmid ?? "pmid"}::${index}`;
}

function ImpactBadge({ impact }: { impact: ImpactKey }) {
  const meta = IMPACT_META[impact];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-caption font-semibold",
        meta.chip,
      )}
    >
      {meta.label}
    </span>
  );
}

function ImpactCountBadge({
  impact,
  count,
}: {
  impact: ImpactKey;
  count: number;
}) {
  if (count === 0) return null;

  const meta = IMPACT_META[impact];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-caption font-semibold",
        meta.chip,
      )}
    >
      {meta.label} {count}
    </span>
  );
}

function truncateText(text: string, limit: number) {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit).trim()}...`;
}

export function CancerHallmarksOverview({
  hallmarks,
  geneSymbol,
  className,
}: CancerHallmarksOverviewProps) {
  const [impactFilter, setImpactFilter] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    if (!hallmarks || hallmarks.length === 0) return [];

    const map = new Map<string, HallmarkEvidence[]>();

    hallmarks.forEach((item) => {
      const label = item.label?.trim() || "Unlabeled hallmark";
      const bucket = map.get(label) ?? [];
      bucket.push(item);
      map.set(label, bucket);
    });

    return Array.from(map.entries())
      .map(([label, items]) => {
        const counts = { promotes: 0, suppresses: 0, unknown: 0 } as Record<ImpactKey, number>;
        items.forEach((item) => {
          counts[normalizeImpact(item.impact)] += 1;
        });

        return { label, items, counts };
      })
      .sort((a, b) => {
        if (b.items.length !== a.items.length) return b.items.length - a.items.length;
        return a.label.localeCompare(b.label);
      });
  }, [hallmarks]);

  const filteredGroups = useMemo(() => {
    if (impactFilter === "all") return groups;

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) => normalizeImpact(item.impact) === impactFilter,
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, impactFilter]);

  const dimensions: DimensionConfig[] = useMemo(
    () => [
      {
        label: "Impact",
        value: impactFilter,
        onChange: setImpactFilter,
        presentation: "segmented",
        options: [
          { value: "all", label: "All" },
          { value: "promotes", label: "Promotes" },
          { value: "suppresses", label: "Suppresses" },
          { value: "unknown", label: "Unknown" },
        ],
      },
    ],
    [impactFilter],
  );

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (!hallmarks || hallmarks.length === 0) {
    return (
      <NoDataState
        categoryName="Cancer Hallmarks"
        description="No cancer hallmark evidence is available for this gene."
      />
    );
  }

  return (
    <Card className={cn("border border-slate-200 py-0 gap-0", className)}>
      <CardHeader className="border-b border-slate-200 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold text-heading">
              Cancer Hallmarks{geneSymbol ? ` (${geneSymbol})` : ""}
            </CardTitle>
            <div className="text-xs text-subtle">
              Literature evidence grouped by hallmark and impact
            </div>
          </div>
          <div className="text-xs text-subtle">Open Targets</div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filter Bar - flat panel, no shadow */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <ScopeBar dimensions={dimensions} />
        </div>

        {/* Empty Filter State */}
        {filteredGroups.length === 0 && (
          <div className="py-10 text-body-sm text-subtle text-center">
            No hallmarks match the selected filters.
          </div>
        )}

        {/* Hallmark Groups */}
        {filteredGroups.map((group) => (
          <div
            key={group.label}
            className="rounded-xl border border-slate-200 bg-white overflow-hidden"
          >
            {/* Group Header */}
            <div className="px-6 py-4 border-b border-slate-200">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-section-header">{group.label}</div>
                  <div className="text-body-sm text-subtle">
                    {group.items.length} evidence items
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <ImpactCountBadge impact="promotes" count={group.counts.promotes} />
                  <ImpactCountBadge impact="suppresses" count={group.counts.suppresses} />
                  <ImpactCountBadge impact="unknown" count={group.counts.unknown} />
                </div>
              </div>
            </div>

            {/* Evidence Items */}
            <div className="p-6 space-y-3">
              {group.items.map((item, index) => {
                const key = getEvidenceKey(group.label, item, index);
                const normalizedImpact = normalizeImpact(item.impact);
                const description = item.description?.trim() || "No description available.";
                const isExpanded = expanded.has(key);
                const shouldTruncate = description.length > 180;

                return (
                  <div
                    key={key}
                    className={cn(
                      "rounded-xl border border-slate-200 bg-white p-4 space-y-3",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="text-sm font-semibold text-heading leading-snug">
                          {shouldTruncate && !isExpanded
                            ? truncateText(description, 180)
                            : description}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-body-sm text-subtle">
                          <ImpactBadge impact={normalizedImpact} />
                          <div>
                            PMID: <span className="text-data">{item.pmid ?? "N/A"}</span>
                          </div>
                        </div>
                        {shouldTruncate && (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(key)}
                            className="text-body-sm text-primary hover:underline"
                          >
                            {isExpanded ? "Show less" : "Show more"}
                          </button>
                        )}
                      </div>
                      {item.pmid && (
                        <ExternalLink
                          href={`https://pubmed.ncbi.nlm.nih.gov/${item.pmid}`}
                          className="shrink-0 text-body-sm text-subtle hover:text-primary"
                          iconSize="sm"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          PubMed
                        </ExternalLink>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
