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
import { LinkChip } from "@shared/components/ui/status-badge";
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

const IMPACT_CONFIG: Record<ImpactKey, { label: string; icon: string; className: string }> = {
  promotes: { label: "Promotes cancer", icon: "↑", className: "bg-rose-100 text-rose-700" },
  suppresses: { label: "Suppresses cancer", icon: "↓", className: "bg-emerald-100 text-emerald-700" },
  unknown: { label: "Unknown effect", icon: "", className: "bg-slate-100 text-slate-600" },
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
    <Card className={cn("border border-slate-200 py-0 gap-0", className)}>
      {/* Header */}
      <CardHeader className="border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold text-slate-900">
              Cancer Hallmarks
            </CardTitle>
            <div className="text-sm text-slate-500">
              How this gene affects the hallmarks of cancer progression
            </div>
          </div>
          <div className="text-right text-sm text-slate-500">
            <div>{hallmarks.length} evidence items</div>
            <div>{groups.length} hallmarks</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Filters */}
        <div className="border-b border-slate-200 bg-slate-50/50">
          <ScopeBar dimensions={dimensions} />
        </div>

        {/* Master-Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr]">
          {/* Hallmark List */}
          <div className="border-b border-slate-200 lg:border-b-0 lg:border-r">
            <div className="max-h-[520px] overflow-y-auto">
              {filteredGroups.length === 0 ? (
                <div className="px-6 py-8 text-body-sm text-subtle">
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
                        "w-full px-6 py-3 text-left border-b border-slate-100 transition-colors",
                        "hover:bg-slate-50",
                        isSelected && "bg-primary/5 border-l-2 border-l-primary"
                      )}
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-heading">
                          {group.label}
                        </div>
                        <div className="flex items-center gap-2 text-body-sm">
                          <span className="text-subtle">{group.total} evidence</span>
                          {group.counts.promotes > 0 && (
                            <span className="text-rose-600">{group.counts.promotes} ↑</span>
                          )}
                          {group.counts.suppresses > 0 && (
                            <span className="text-emerald-600">{group.counts.suppresses} ↓</span>
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
            <div className="px-6 py-2.5 border-b border-slate-200 bg-slate-100">
              <div className="text-body-sm font-medium text-subtle">Evidence</div>
            </div>
            <div className="px-6 py-6 space-y-6">
              {!selectedGroup ? (
                <div className="text-body-sm text-subtle">
                  Select a hallmark to view evidence.
                </div>
              ) : (
                <>
                  {/* Hallmark Header */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-heading">
                      {selectedGroup.label}
                    </h3>
                    {getHallmarkDescription(selectedGroup.label) && (
                      <div className="text-sm text-subtle">
                        {getHallmarkDescription(selectedGroup.label)}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-body-sm">
                      <span className="text-subtle">{selectedGroup.total} publications</span>
                      {selectedGroup.counts.promotes > 0 && (
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium", IMPACT_CONFIG.promotes.className)}>
                          ↑ {selectedGroup.counts.promotes} promote
                        </span>
                      )}
                      {selectedGroup.counts.suppresses > 0 && (
                        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium", IMPACT_CONFIG.suppresses.className)}>
                          ↓ {selectedGroup.counts.suppresses} suppress
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Evidence List */}
                  <div className="space-y-3">
                    <div>
                      <div className="text-body-sm font-medium text-subtle">Literature Evidence</div>
                      <div className="text-caption text-subtle">Published findings about this gene's role</div>
                    </div>
                    <div className="space-y-3">
                      {selectedGroup.items.map((item, index) => {
                        const impact = normalizeImpact(item.impact);
                        const config = IMPACT_CONFIG[impact];

                        return (
                          <div
                            key={`${item.pmid}-${index}`}
                            className="p-4 rounded-lg border border-slate-200 space-y-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-body-sm font-medium shrink-0",
                                config.className
                              )}>
                                {impact !== "unknown" && config.icon} {config.label}
                              </span>
                              {item.pmid && (
                                <LinkChip href={`https://pubmed.ncbi.nlm.nih.gov/${item.pmid}`}>
                                  PMID {item.pmid}
                                </LinkChip>
                              )}
                            </div>
                            {item.description && (
                              <div className="text-sm text-body leading-relaxed">
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
