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
import { useEffect, useMemo, useState } from "react";

// ============================================================================
// Types
// ============================================================================

interface CancerHallmarksOverviewProps {
  hallmarks?: Gene["opentargets"]["hallmarks"]["cancerHallmarks"] | null;
  geneSymbol?: string | null;
  className?: string;
}

type HallmarkEvidence = NonNullable<Gene["opentargets"]["hallmarks"]["cancerHallmarks"]>[number];
type ImpactKey = "promotes" | "suppresses" | "unknown";

// ============================================================================
// Constants
// ============================================================================

const IMPACT_CONFIG: Record<ImpactKey, { label: string; dotClass: string }> = {
  promotes: { label: "Promotes cancer", dotClass: "bg-red-500" },
  suppresses: { label: "Suppresses cancer", dotClass: "bg-emerald-500" },
  unknown: { label: "Unknown effect", dotClass: "bg-muted-foreground" },
};

// Hallmark descriptions for context
const HALLMARK_DESCRIPTIONS: Record<string, string> = {
  "proliferative signalling": "Sustaining cell division signals",
  "growth suppressors": "Evading growth inhibitors",
  "escaping cell death": "Resisting programmed cell death",
  "replicative immortality": "Enabling unlimited replication",
  "angiogenesis": "Inducing blood vessel formation",
  "invasion and metastasis": "Enabling tissue invasion and spread",
  "genome instability": "Accumulating genetic mutations",
  "tumour promoting inflammation": "Inflammation aiding tumor growth",
  "cellular energetics": "Reprogramming energy metabolism",
  "escaping immune response": "Evading immune destruction",
};

// ============================================================================
// Utilities
// ============================================================================

function normalizeImpact(impact?: string | null): ImpactKey {
  if (!impact) return "unknown";
  const normalized = impact.toLowerCase();
  if (normalized.includes("promot") || normalized.includes("increase") || normalized.includes("enhance") || normalized.includes("activate")) {
    return "promotes";
  }
  if (normalized.includes("suppress") || normalized.includes("decrease") || normalized.includes("reduce") || normalized.includes("inhibit")) {
    return "suppresses";
  }
  return "unknown";
}

function getHallmarkDescription(label: string): string {
  const key = label.toLowerCase();
  return HALLMARK_DESCRIPTIONS[key] || "";
}

// ============================================================================
// Main Component
// ============================================================================

export function CancerHallmarksOverview({
  hallmarks,
  className,
}: CancerHallmarksOverviewProps) {
  const [impactFilter, setImpactFilter] = useState("all");
  const [selectedHallmark, setSelectedHallmark] = useState<string | null>(null);

  // Group hallmarks by label
  const groups = useMemo(() => {
    if (!hallmarks || hallmarks.length === 0) return [];

    const map = new Map<string, HallmarkEvidence[]>();
    hallmarks.forEach((item) => {
      const label = item.label?.trim() || "Unlabeled";
      const bucket = map.get(label) ?? [];
      bucket.push(item);
      map.set(label, bucket);
    });

    return Array.from(map.entries())
      .map(([label, items]) => {
        const counts = { promotes: 0, suppresses: 0, unknown: 0 };
        items.forEach((item) => counts[normalizeImpact(item.impact)]++);
        return { label, items, counts, total: items.length };
      })
      .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
  }, [hallmarks]);

  // Count by impact
  const impactCounts = useMemo(() => {
    const counts = { promotes: 0, suppresses: 0, unknown: 0 };
    (hallmarks ?? []).forEach((item) => counts[normalizeImpact(item.impact)]++);
    return counts;
  }, [hallmarks]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    if (impactFilter === "all") return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => normalizeImpact(item.impact) === impactFilter),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, impactFilter]);

  // Filter dimensions
  const dimensions = useMemo<DimensionConfig[]>(() => [
    {
      label: "Effect",
      value: impactFilter,
      onChange: setImpactFilter,
      options: [
        { value: "all", label: `All (${hallmarks?.length ?? 0})` },
        { value: "promotes", label: `Promotes (${impactCounts.promotes})` },
        { value: "suppresses", label: `Suppresses (${impactCounts.suppresses})` },
      ],
    },
  ], [impactFilter, hallmarks?.length, impactCounts]);

  // Auto-select first hallmark
  useEffect(() => {
    if (filteredGroups.length === 0) {
      setSelectedHallmark(null);
    } else if (!selectedHallmark || !filteredGroups.some((g) => g.label === selectedHallmark)) {
      setSelectedHallmark(filteredGroups[0].label);
    }
  }, [filteredGroups, selectedHallmark]);

  // Get selected group
  const selectedGroup = useMemo(() => {
    if (!selectedHallmark) return filteredGroups[0] ?? null;
    return filteredGroups.find((g) => g.label === selectedHallmark) ?? filteredGroups[0] ?? null;
  }, [filteredGroups, selectedHallmark]);

  // Empty state
  if (!hallmarks || hallmarks.length === 0) {
    return (
      <NoDataState
        categoryName="Cancer Hallmarks"
        description="No cancer hallmark evidence is available for this gene."
      />
    );
  }

  return (
    <Card className={cn("border border-border py-0 gap-0", className)}>
      {/* Header */}
      <CardHeader className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold text-foreground">
              Cancer Hallmarks
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              How this gene affects the hallmarks of cancer progression
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div>{hallmarks.length} evidence items</div>
            <div>{groups.length} hallmarks</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Filters */}
        <div className="border-b border-border bg-muted/50">
          <ScopeBar dimensions={dimensions} />
        </div>

        {/* Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr]">
          {/* Hallmark List */}
          <div className="border-b border-border lg:border-b-0 lg:border-r">
            <div className="max-h-[600px] overflow-y-auto">
              {filteredGroups.length === 0 ? (
                <div className="px-5 py-8 text-[11px] text-muted-foreground">
                  No hallmarks match your filters.
                </div>
              ) : (
                filteredGroups.map((group) => {
                  const isSelected = selectedHallmark === group.label;

                  return (
                    <button
                      key={group.label}
                      type="button"
                      onClick={() => setSelectedHallmark(group.label)}
                      className={cn(
                        "w-full px-5 py-2.5 text-left border-b border-border/60 transition-colors",
                        "hover:bg-accent/50",
                        isSelected && "bg-accent/70"
                      )}
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-foreground">
                          {group.label}
                        </div>
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="text-muted-foreground">{group.total} evidence</span>
                          {group.counts.promotes > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                              <span className="text-[10px] text-muted-foreground">{group.counts.promotes} promote</span>
                            </span>
                          )}
                          {group.counts.suppresses > 0 && (
                            <span className="inline-flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              <span className="text-[10px] text-muted-foreground">{group.counts.suppresses} suppress</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Detail Panel */}
          <div>
            <div className="px-5 py-1.5 border-b border-border bg-muted/60">
              <div className="text-[11px] font-medium text-muted-foreground">Evidence</div>
            </div>
            <div className="px-5 py-5 space-y-5">
              {!selectedGroup ? (
                <div className="text-[11px] text-muted-foreground">
                  Select a hallmark to view evidence.
                </div>
              ) : (
                <>
                  {/* Hallmark Header */}
                  <div className="space-y-2">
                    <h3 className="text-[15px] font-semibold text-foreground">
                      {selectedGroup.label}
                    </h3>
                    {getHallmarkDescription(selectedGroup.label) && (
                      <div className="text-[13px] text-muted-foreground leading-relaxed">
                        {getHallmarkDescription(selectedGroup.label)}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="text-muted-foreground">{selectedGroup.total} publications</span>
                      {selectedGroup.counts.promotes > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-red-500" />
                          <span className="text-[11px] text-muted-foreground">{selectedGroup.counts.promotes} promote</span>
                        </span>
                      )}
                      {selectedGroup.counts.suppresses > 0 && (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="text-[11px] text-muted-foreground">{selectedGroup.counts.suppresses} suppress</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Evidence List */}
                  <div className="space-y-3">
                    <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      Literature Evidence
                    </div>
                    <div className="space-y-3">
                      {selectedGroup.items.map((item, index) => {
                        const impact = normalizeImpact(item.impact);
                        const config = IMPACT_CONFIG[impact];

                        return (
                          <div
                            key={`${item.pmid}-${index}`}
                            className="rounded-lg border border-border/60 p-3 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className="inline-flex items-center gap-1.5 shrink-0">
                                <span className={cn("h-2 w-2 rounded-full", config.dotClass)} />
                                <span className="text-[11px] text-muted-foreground">{config.label}</span>
                              </span>
                              {item.pmid && (
                                <ExternalLink
                                  href={`https://pubmed.ncbi.nlm.nih.gov/${item.pmid}`}
                                  className="text-xs text-primary hover:underline"
                                  iconSize="sm"
                                >
                                  PMID {item.pmid}
                                </ExternalLink>
                              )}
                            </div>
                            {item.description && (
                              <div className="text-[13px] text-muted-foreground leading-relaxed">
                                {item.description}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
