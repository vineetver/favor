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
  high: { label: "High quality", dotClass: "bg-success" },
  calculated: { label: "Calculated", dotClass: "bg-warning" },
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
      <span className="text-sm font-semibold text-heading w-8 tabular-nums">{formatScore(value)}</span>
      <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary/60"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  );
}

function QualityDot({ level }: { level: QualityLevel }) {
  return (
    <span className={cn("w-2 h-2 rounded-full shrink-0", QUALITY_CONFIG[level].dotClass)} />
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
      <CardHeader className="border-b border-border px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold text-foreground">
              Chemical Probes
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Small molecules for studying this target in cells and organisms
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div>{sortedProbes.length} probes available</div>
            {qualityCounts.high > 0 && (
              <div className="text-success font-medium">
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
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr]">
          {/* Probe List */}
          <div className="border-b border-border lg:border-b-0 lg:border-r">
            <div className="max-h-[480px] overflow-y-auto">
              {filteredProbes.length === 0 ? (
                <div className="px-6 py-8 text-body-sm text-subtle">
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
                        "w-full px-6 py-3 text-left border-b border-border transition-colors",
                        "hover:bg-muted",
                        isSelected && "bg-primary/5 border-l-2 border-l-primary"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <QualityDot level={quality} />
                          <span className="text-sm font-medium text-heading truncate">
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
            <div className="px-6 py-2.5 border-b border-border bg-muted">
              <div className="text-body-sm font-medium text-subtle">Details</div>
            </div>
            <div className="px-6 py-6 space-y-6">
              {!selected ? (
                <div className="text-body-sm text-subtle">
                  Select a probe to view details.
                </div>
              ) : (
                <>
                  {/* Probe Header */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-heading">
                        {selected.id || "Unknown"}
                      </h3>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-body-sm font-medium",
                        getQualityLevel(selected) === "high" && "bg-success/10 text-success",
                        getQualityLevel(selected) === "calculated" && "bg-warning/10 text-warning",
                        getQualityLevel(selected) === "standard" && "bg-muted text-muted-foreground",
                      )}>
                        <QualityDot level={getQualityLevel(selected)} />
                        {getQualityLevel(selected) === "high" ? "Recommended" : QUALITY_CONFIG[getQualityLevel(selected)].label}
                      </span>
                    </div>
                    {selected.mechanismOfAction && selected.mechanismOfAction.length > 0 && (
                      <div className="text-sm text-body">
                        <span className="text-subtle">Mechanism: </span>
                        {selected.mechanismOfAction.join(", ")}
                      </div>
                    )}
                  </div>

                  {/* Scores - with explanation */}
                  <div className="space-y-3">
                    <div>
                      <div className="text-body-sm font-medium text-subtle">Quality Scores</div>
                      <div className="text-caption text-subtle">Higher scores indicate better selectivity and potency (0-100)</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <ScoreItem label="Overall" value={selected.probesDrugsScore} description="Combined quality score" />
                      <ScoreItem label="ProbeMiner" value={selected.probeMinerScore} description="Database quality rating" />
                      <ScoreItem label="In Cells" value={selected.scoreInCells} description="Cell assay performance" />
                      <ScoreItem label="In Organisms" value={selected.scoreInOrganisms} description="In vivo performance" />
                    </div>
                  </div>

                  {/* Control compound - important for experiments */}
                  {selected.control && (
                    <div className="space-y-2">
                      <div className="text-body-sm font-medium text-subtle">Negative Control</div>
                      <div className="text-sm text-body">
                        Use <span className="font-medium">{selected.control}</span> as inactive control in experiments
                      </div>
                    </div>
                  )}

                  {/* IDs for lookup */}
                  {(selected.targetFromSourceId || selected.drugId) && (
                    <div className="space-y-2">
                      <div className="text-body-sm font-medium text-subtle">Identifiers</div>
                      <div className="flex flex-wrap gap-2">
                        {selected.drugId && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted text-body-sm font-mono">
                            {selected.drugId}
                          </span>
                        )}
                        {selected.targetFromSourceId && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted text-body-sm font-mono">
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
                          className="text-sm text-primary hover:underline"
                        >
                          {urlObj.niceName || "Source"}
                        </ExternalLink>
                      )
                    ))}
                    <ExternalLink
                      href="https://www.probes-drugs.org"
                      className="text-sm text-primary hover:underline"
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

function ScoreItem({ label, value, description }: { label: string; value: number | null | undefined; description?: string }) {
  const formatted = formatScore(value);
  const hasValue = formatted !== "—";
  const percent = hasValue ? Math.min(100, value ?? 0) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-body-sm text-subtle">{label}</span>
        <span className={cn(
          "text-sm font-semibold tabular-nums",
          hasValue ? "text-heading" : "text-subtle"
        )}>
          {formatted}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full", hasValue ? "bg-primary/60" : "bg-slate-200")}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
