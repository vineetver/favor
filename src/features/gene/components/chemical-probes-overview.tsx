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
import { ExternalLink } from "@shared/components/ui/external-link";
import { ScopeBar } from "@shared/components/ui/data-surface/scope-bar";
import type { DimensionConfig } from "@shared/components/ui/data-surface/types";
import { useEffect, useMemo, useState } from "react";

// ============================================================================
// Types
// ============================================================================

interface ChemicalProbesOverviewProps {
  probes?: Gene["opentargets"]["chemical_probes"] | null;
  geneSymbol?: string | null;
  className?: string;
}

type ChemicalProbe = NonNullable<Gene["opentargets"]["chemical_probes"]>[number];
type QualityLevel = "high" | "calculated" | "standard";

// ============================================================================
// Constants
// ============================================================================

const QUALITY_CONFIG: Record<QualityLevel, { label: string; dotClass: string }> = {
  high: { label: "High quality", dotClass: "bg-emerald-500" },
  calculated: { label: "Calculated", dotClass: "bg-amber-500" },
  standard: { label: "Standard", dotClass: "bg-muted-foreground" },
};

// ============================================================================
// Utilities
// ============================================================================

function getProbeKey(probe: ChemicalProbe): string {
  return `${probe.id || "probe"}::${probe.drugId || "drug"}`;
}

function getQualityLevel(probe: ChemicalProbe): QualityLevel {
  if (probe.isHighQuality) return "high";
  if (probe.origin?.includes("calculated")) return "calculated";
  return "standard";
}

function formatScore(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toFixed(0);
}

// ============================================================================
// Sub-components
// ============================================================================

function ScoreBar({ value, max = 100 }: { value: number | null | undefined; max?: number }) {
  const numeric = typeof value === "number" ? value : 0;
  const percent = Math.round((numeric / max) * 100);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-foreground w-8 tabular-nums">{formatScore(value)}</span>
      <div className="h-1 w-12 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-foreground/25"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  );
}

function QualityDot({ level }: { level: QualityLevel }) {
  return (
    <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", QUALITY_CONFIG[level].dotClass)} />
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ChemicalProbesOverview({
  probes,
  className,
}: ChemicalProbesOverviewProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [qualityFilter, setQualityFilter] = useState<string>("all");
  const [sortMode, setSortMode] = useState<string>("score-desc");

  // Sort probes
  const sortedProbes = useMemo(() => {
    const items = [...(probes ?? [])];
    if (sortMode === "alpha") {
      return items.sort((a, b) => (a.id || "").localeCompare(b.id || ""));
    }
    return items.sort((a, b) => (b.probesDrugsScore ?? -1) - (a.probesDrugsScore ?? -1));
  }, [probes, sortMode]);

  // Filter by quality
  const filteredProbes = useMemo(() => {
    if (qualityFilter === "all") return sortedProbes;
    return sortedProbes.filter((probe) => getQualityLevel(probe) === qualityFilter);
  }, [sortedProbes, qualityFilter]);

  // Count probes by quality
  const qualityCounts = useMemo(() => {
    const counts = { high: 0, calculated: 0, standard: 0 };
    for (const probe of sortedProbes) {
      counts[getQualityLevel(probe)]++;
    }
    return counts;
  }, [sortedProbes]);

  // Filter dimensions
  const dimensions = useMemo<DimensionConfig[]>(() => [
    {
      label: "Quality",
      value: qualityFilter,
      onChange: setQualityFilter,
      options: [
        { value: "all", label: `All (${sortedProbes.length})` },
        { value: "high", label: `High (${qualityCounts.high})` },
        { value: "calculated", label: `Calculated (${qualityCounts.calculated})` },
        { value: "standard", label: `Standard (${qualityCounts.standard})` },
      ],
    },
    {
      label: "Sort by",
      value: sortMode,
      onChange: setSortMode,
      options: [
        { value: "score-desc", label: "Score" },
        { value: "alpha", label: "A-Z" },
      ],
      presentation: "segmented",
    },
  ], [qualityFilter, sortMode, sortedProbes.length, qualityCounts]);

  // Auto-select first probe when filter changes
  useEffect(() => {
    if (!filteredProbes.length) {
      setSelectedKey(null);
    } else if (!selectedKey || !filteredProbes.some((p) => getProbeKey(p) === selectedKey)) {
      setSelectedKey(getProbeKey(filteredProbes[0]));
    }
  }, [filteredProbes, selectedKey]);

  // Get selected probe
  const selected = useMemo(() => {
    if (!filteredProbes.length) return null;
    return filteredProbes.find((p) => getProbeKey(p) === selectedKey) ?? filteredProbes[0];
  }, [filteredProbes, selectedKey]);

  // Empty state
  if (!probes || probes.length === 0) {
    return (
      <NoDataState
        categoryName="Chemical Probes"
        description="No chemical probe data is available for this gene."
      />
    );
  }

  return (
    <Card className={cn("overflow-hidden border border-border py-0 gap-0", className)}>
      {/* Header */}
      <CardHeader className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold text-foreground">
              Chemical Probes
            </CardTitle>
            <div className="text-[13px] text-muted-foreground">
              Small molecules for studying this target in cells and organisms
            </div>
          </div>
          <div className="text-right text-[13px] text-muted-foreground">
            <div>{sortedProbes.length} probes available</div>
            {qualityCounts.high > 0 && (
              <div className="text-emerald-600 font-medium">
                {qualityCounts.high} recommended
              </div>
            )}
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
          {/* Probe List */}
          <div className="border-b border-border lg:border-b-0 lg:border-r">
            <div className="max-h-[600px] overflow-y-auto">
              {filteredProbes.length === 0 ? (
                <div className="px-5 py-8 text-[13px] text-muted-foreground">
                  No probes match your filters.
                </div>
              ) : (
                filteredProbes.map((probe) => {
                  const key = getProbeKey(probe);
                  const isSelected = selectedKey === key;
                  const quality = getQualityLevel(probe);

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedKey(key)}
                      className={cn(
                        "w-full px-5 py-2.5 text-left border-b border-border/60 transition-colors",
                        "hover:bg-accent/50",
                        isSelected && "bg-accent/70"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <QualityDot level={quality} />
                          <span className="text-sm font-medium text-foreground truncate">
                            {probe.id || "Unknown"}
                          </span>
                        </div>
                        <ScoreBar value={probe.probesDrugsScore} />
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
              <div className="text-[11px] font-medium text-muted-foreground">Details</div>
            </div>
            <div className="px-5 py-5 space-y-5">
              {!selected ? (
                <div className="text-[13px] text-muted-foreground">
                  Select a probe to view details.
                </div>
              ) : (
                <>
                  {/* Probe Header */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-[15px] font-semibold text-foreground">
                        {selected.id || "Unknown"}
                      </h3>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 text-[11px] font-medium",
                        getQualityLevel(selected) === "high" && "text-emerald-600",
                        getQualityLevel(selected) === "calculated" && "text-amber-600",
                        getQualityLevel(selected) === "standard" && "text-muted-foreground",
                      )}>
                        <QualityDot level={getQualityLevel(selected)} />
                        {getQualityLevel(selected) === "high" ? "Recommended" : QUALITY_CONFIG[getQualityLevel(selected)].label}
                      </span>
                    </div>
                    {selected.mechanismOfAction && selected.mechanismOfAction.length > 0 && (
                      <div className="text-[13px] text-muted-foreground">
                        <span className="text-muted-foreground">Mechanism: </span>
                        {selected.mechanismOfAction.join(", ")}
                      </div>
                    )}
                  </div>

                  {/* Scores - with explanation */}
                  <div className="space-y-3">
                    <div>
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Quality Scores</div>
                      <div className="text-[11px] text-muted-foreground">Higher scores indicate better selectivity and potency (0-100)</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <ScoreItem label="Overall" value={selected.probesDrugsScore} />
                      <ScoreItem label="ProbeMiner" value={selected.probeMinerScore} />
                      <ScoreItem label="In Cells" value={selected.scoreInCells} />
                      <ScoreItem label="In Organisms" value={selected.scoreInOrganisms} />
                    </div>
                  </div>

                  {/* Control compound - important for experiments */}
                  {selected.control && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Negative Control</div>
                      <div className="text-[13px] text-muted-foreground">
                        Use <span className="font-medium">{selected.control}</span> as inactive control in experiments
                      </div>
                    </div>
                  )}

                  {/* IDs for lookup */}
                  {(selected.targetFromSourceId || selected.drugId) && (
                    <div className="space-y-2">
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Identifiers</div>
                      <div className="flex flex-wrap gap-2">
                        {selected.drugId && (
                          <span className="bg-muted px-2 py-0.5 text-[11px] text-muted-foreground rounded font-mono">
                            {selected.drugId}
                          </span>
                        )}
                        {selected.targetFromSourceId && (
                          <span className="bg-muted px-2 py-0.5 text-[11px] text-muted-foreground rounded font-mono">
                            {selected.targetFromSourceId}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Links */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {selected.urls?.map((urlObj, index) => (
                      urlObj.url && (
                        <ExternalLink
                          key={`${urlObj.url}-${index}`}
                          href={urlObj.url}
                          className="text-xs text-primary hover:underline"
                        >
                          {urlObj.niceName || "Source"}
                        </ExternalLink>
                      )
                    ))}
                    <ExternalLink
                      href="https://www.probes-drugs.org"
                      className="text-xs text-primary hover:underline"
                    >
                      Probes & Drugs
                    </ExternalLink>
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

// ============================================================================
// Score Item
// ============================================================================

function ScoreItem({ label, value }: { label: string; value: number | null | undefined }) {
  const formatted = formatScore(value);
  const hasValue = formatted !== "—";
  const percent = hasValue ? Math.min(100, value ?? 0) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">{label}</span>
        <span className={cn(
          "text-sm font-semibold tabular-nums",
          hasValue ? "text-foreground" : "text-muted-foreground"
        )}>
          {formatted}
        </span>
      </div>
      <div className="h-1 rounded-full bg-border overflow-hidden">
        <div
          className={cn("h-full rounded-full", hasValue ? "bg-foreground/25" : "bg-border")}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
