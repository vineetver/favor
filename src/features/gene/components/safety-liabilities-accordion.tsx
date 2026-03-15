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
import { ChevronDown, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// ============================================================================
// Types
// ============================================================================

interface SafetyLiabilitiesAccordionProps {
  liabilities?: Gene["opentargets"]["safety_liabilities"] | null;
  geneSymbol?: string | null;
  className?: string;
}

type SafetyLiability = NonNullable<Gene["opentargets"]["safety_liabilities"]>[number];
type DirectionCategory = "increase" | "decrease" | "mixed" | "unknown";

// ============================================================================
// Constants
// ============================================================================

const DIRECTION_CONFIG: Record<DirectionCategory, { label: string; dotColor: string; textColor: string }> = {
  increase: { label: "Increases risk", dotColor: "bg-red-500", textColor: "text-red-500/80" },
  decrease: { label: "Decreases risk", dotColor: "bg-emerald-500", textColor: "text-emerald-600" },
  mixed: { label: "Variable", dotColor: "bg-amber-500", textColor: "text-amber-500/80" },
  unknown: { label: "Unknown", dotColor: "bg-muted-foreground/40", textColor: "text-muted-foreground" },
};

// ============================================================================
// Utilities
// ============================================================================

function classifyDirection(text: string): DirectionCategory {
  const normalized = text.toLowerCase();
  if (normalized.includes("increase") || normalized.includes("up") || normalized.includes("positive") || normalized.includes("elevated")) {
    return "increase";
  }
  if (normalized.includes("decrease") || normalized.includes("down") || normalized.includes("negative") || normalized.includes("reduced")) {
    return "decrease";
  }
  return "unknown";
}

function getDirectionSummary(effects: SafetyLiability["effects"]): DirectionCategory {
  if (!effects || effects.length === 0) return "unknown";
  const directions = new Set<DirectionCategory>();
  effects.forEach((effect) => {
    if (effect.direction) directions.add(classifyDirection(effect.direction));
  });
  if (directions.has("increase") && directions.has("decrease")) return "mixed";
  if (directions.has("increase")) return "increase";
  if (directions.has("decrease")) return "decrease";
  return "unknown";
}

function getLiabilityKey(item: SafetyLiability, index: number) {
  return `${item.eventId || item.event || "event"}::${item.datasource || "source"}::${index}`;
}

/** A study is "real" only if it has a name or description — not a placeholder */
function isRealStudy(study: { name?: string | null; description?: string | null }): boolean {
  return Boolean(study.name || study.description);
}

function getRealStudies(item: SafetyLiability) {
  return (item.studies ?? []).filter(isRealStudy);
}

function parseLiterature(literature?: string | null): string[] {
  if (!literature) return [];
  return Array.from(new Set(
    literature.split(/[,;\s]+/).map((e) => e.trim()).filter(Boolean)
  ));
}

// Format technical study names like "TOX21_ERa_BLA_Antagonist_ratio" into readable text
function formatStudyName(name: string): string {
  if (!name) return "Unnamed study";

  // Common abbreviation expansions
  const expansions: Record<string, string> = {
    "TOX21": "Tox21",
    "ATG": "Attagene",
    "BLA": "β-lactamase",
    "LUC": "Luciferase",
    "ERa": "ERα",
    "ERb": "ERβ",
    "AR": "Androgen Receptor",
    "GR": "Glucocorticoid Receptor",
    "PR": "Progesterone Receptor",
    "TRANS": "Transactivation",
    "CIS": "Cis-regulatory",
    "ERE": "Estrogen Response Element",
    "VM7": "VM7 cells",
    "dn": "down",
    "up": "up",
  };

  // Split by underscores
  const parts = name.split("_");

  // Process each part
  const processed = parts.map((part) => {
    // Check for known expansions
    if (expansions[part]) return expansions[part];

    // Handle concentration patterns like "0.5nM"
    if (/^\d+\.?\d*(nM|uM|mM|pM)$/i.test(part)) {
      return part;
    }

    // Capitalize first letter for regular words
    if (part.length > 2 && /^[a-z]+$/i.test(part)) {
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    }

    return part;
  });

  // Join with spaces and clean up
  return processed.join(" ").replace(/\s+/g, " ").trim();
}

// Get a description based on study type
function getStudyTypeDescription(type?: string | null): string {
  if (!type) return "";
  const lower = type.toLowerCase();
  if (lower.includes("cell")) return "Cell-based assay";
  if (lower.includes("vivo") || lower.includes("animal")) return "In vivo study";
  if (lower.includes("vitro")) return "In vitro assay";
  if (lower.includes("clinical")) return "Clinical study";
  return type;
}

/** Format raw variant coords (6_152103343_A_A,A) into readable notation (chr6:152103343 A>A/A) */
function formatVariantCoord(raw: string): string {
  const parts = raw.trim().split("_");
  if (parts.length < 3) return raw;
  const [chrom, pos, ref, ...genotypes] = parts;
  const gt = genotypes.join("/");
  return `chr${chrom}:${Number(pos).toLocaleString()} ${ref}>${gt}`;
}

/** Clean up ClinPGx descriptions that contain raw variant notation */
function formatStudyDescription(desc: string): { text: string; variants: string[] } | null {
  if (!desc) return null;
  const match = desc.match(/^(.+?):\s*(.+)$/);
  if (!match) return { text: desc, variants: [] };

  const [, prefix, variantList] = match;
  // Check if the suffix looks like variant coords (e.g. "6_152103343_A_A,A")
  const rawVariants = variantList.split(/,\s*/).map((v) => v.trim()).filter(Boolean);
  const looksLikeCoords = rawVariants.some((v) => /^\d+_\d+_[ACGT]/.test(v));

  if (looksLikeCoords) {
    return {
      text: prefix,
      variants: rawVariants.map(formatVariantCoord),
    };
  }
  return { text: desc, variants: [] };
}

// ============================================================================
// Direction Indicator
// ============================================================================

function DirectionDot({ direction, size = "sm" }: { direction: DirectionCategory; size?: "sm" | "md" }) {
  const config = DIRECTION_CONFIG[direction];
  const dotSize = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn(dotSize, "rounded-full shrink-0", config.dotColor)} />
      <span className={cn(
        size === "sm" ? "text-[10px]" : "text-[11px]",
        "text-muted-foreground"
      )}>
        {config.label}
      </span>
    </span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function SafetyLiabilitiesAccordion({
  liabilities,
  className,
}: SafetyLiabilitiesAccordionProps) {
  const [directionFilter, setDirectionFilter] = useState("all");
  const [studyFilter, setStudyFilter] = useState("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [expandedStudies, setExpandedStudies] = useState<Record<string, boolean>>({});

  // Count by direction
  const directionCounts = useMemo(() => {
    const counts = { increase: 0, decrease: 0, mixed: 0, unknown: 0 };
    (liabilities ?? []).forEach((item) => {
      counts[getDirectionSummary(item.effects)]++;
    });
    return counts;
  }, [liabilities]);

  // Count with real studies (not empty placeholders)
  const withStudiesCount = useMemo(() => {
    return (liabilities ?? []).filter((l) => getRealStudies(l).length > 0).length;
  }, [liabilities]);

  // Filter dimensions
  const dimensions = useMemo<DimensionConfig[]>(() => [
    {
      label: "Effect",
      value: directionFilter,
      onChange: setDirectionFilter,
      options: [
        { value: "all", label: `All (${liabilities?.length ?? 0})` },
        { value: "increase", label: `Risk ↑ (${directionCounts.increase})` },
        { value: "decrease", label: `Risk ↓ (${directionCounts.decrease})` },
        { value: "mixed", label: `Variable (${directionCounts.mixed})` },
      ],
    },
    {
      label: "Evidence",
      value: studyFilter,
      onChange: setStudyFilter,
      options: [
        { value: "all", label: "All" },
        { value: "with", label: "Has studies" },
        { value: "without", label: "No studies" },
      ],
      presentation: "segmented",
    },
  ], [directionFilter, studyFilter, liabilities?.length, directionCounts]);

  // Filter liabilities
  const filteredLiabilities = useMemo(() => {
    if (!liabilities) return [];
    return liabilities
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => {
        const summary = getDirectionSummary(item.effects);
        const matchesDirection = directionFilter === "all" || summary === directionFilter;
        const hasStudies = getRealStudies(item).length > 0;
        const matchesStudies = studyFilter === "all" || (studyFilter === "with" ? hasStudies : !hasStudies);
        return matchesDirection && matchesStudies;
      });
  }, [directionFilter, liabilities, studyFilter]);

  // Auto-select first
  useEffect(() => {
    if (filteredLiabilities.length === 0) {
      setSelectedKey(null);
      return;
    }
    if (!selectedKey || !filteredLiabilities.some((e) => getLiabilityKey(e.item, e.index) === selectedKey)) {
      const first = filteredLiabilities[0];
      setSelectedKey(getLiabilityKey(first.item, first.index));
    }
  }, [filteredLiabilities, selectedKey]);

  // Get selected
  const selected = useMemo(() => {
    if (!selectedKey) return filteredLiabilities[0]?.item ?? null;
    const matched = filteredLiabilities.find((e) => getLiabilityKey(e.item, e.index) === selectedKey);
    return matched?.item ?? filteredLiabilities[0]?.item ?? null;
  }, [filteredLiabilities, selectedKey]);

  // Selected effects
  const selectedEffects = useMemo(() => {
    if (!selected?.effects) return [];
    return selected.effects.map((effect) => ({
      direction: effect.direction || "Unknown",
      dosing: effect.dosing || "Not specified",
      category: effect.direction ? classifyDirection(effect.direction) : "unknown" as DirectionCategory,
    }));
  }, [selected]);

  // Biosamples grouped by tissue
  const groupedBiosamples = useMemo(() => {
    if (!selected?.biosamples) return [];
    const map = new Map<string, string[]>();
    selected.biosamples.forEach((sample) => {
      const tissue = sample.tissueLabel || "Unknown tissue";
      const cell = sample.cellLabel || sample.cellFormat || sample.cellId || "Unknown cell";
      if (!map.has(tissue)) map.set(tissue, []);
      const list = map.get(tissue);
      if (list && !list.includes(cell)) list.push(cell);
    });
    return Array.from(map.entries());
  }, [selected]);

  // Literature refs
  const literature = useMemo(() => parseLiterature(selected?.literature), [selected]);

  // Empty state
  if (!liabilities || liabilities.length === 0) {
    return (
      <NoDataState
        categoryName="Safety Liabilities"
        description="No safety liability events are available for this gene."
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
              Safety Liabilities
            </CardTitle>
            <div className="text-[13px] text-muted-foreground">
              Known adverse effects when this target is modulated
            </div>
          </div>
          <div className="text-right text-[13px] text-muted-foreground">
            <div>{liabilities.length} events</div>
            {withStudiesCount > 0 && (
              <div className="text-primary font-medium">{withStudiesCount} with evidence</div>
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
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] max-h-[600px]">
          {/* Event List */}
          <div className="border-b border-border lg:border-b-0 lg:border-r">
            <div className="max-h-[600px] overflow-y-auto">
              {filteredLiabilities.length === 0 ? (
                <div className="px-5 py-8 text-[11px] text-muted-foreground">
                  No events match your filters.
                </div>
              ) : (
                filteredLiabilities.map(({ item, index }) => {
                  const key = getLiabilityKey(item, index);
                  const isSelected = selectedKey === key;
                  const direction = getDirectionSummary(item.effects);

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
                        <div className="min-w-0 flex-1">
                          <div className="text-[13px] font-medium text-foreground truncate">
                            {item.event || "Unnamed event"}
                          </div>
                          {(() => {
                            const real = getRealStudies(item);
                            return real.length > 0 ? (
                              <div className="text-[11px] text-muted-foreground">
                                {real.length} {real.length === 1 ? "study" : "studies"}
                              </div>
                            ) : null;
                          })()}
                        </div>
                        {direction !== "unknown" && (
                          <div className="shrink-0">
                            <DirectionDot direction={direction} size="sm" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Detail Panel */}
          <div className="overflow-y-auto max-h-[600px]">
            <div className="px-5 py-1.5 border-b border-border bg-muted/60">
              <div className="text-[11px] font-medium text-muted-foreground">Details</div>
            </div>
            <div className="px-5 py-5 space-y-5">
              {!selected ? (
                <div className="text-[11px] text-muted-foreground">
                  Select an event to view details.
                </div>
              ) : (
                <>
                  {/* Event Header */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-[15px] font-semibold text-foreground">
                        {selected.event || "Unnamed event"}
                      </h3>
                      <DirectionDot direction={getDirectionSummary(selected.effects)} size="md" />
                    </div>
                    {selected.datasource && (
                      <div className="text-[13px] text-muted-foreground">
                        Source: {selected.datasource}
                      </div>
                    )}
                  </div>

                  {/* Effects */}
                  {selectedEffects.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Effects
                      </div>
                      <div className="space-y-2">
                        {selectedEffects.map((effect, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 rounded-lg border border-border/60">
                            <DirectionDot direction={effect.category} size="md" />
                            <div className="text-[13px] text-muted-foreground">
                              <span className="text-foreground">{effect.dosing}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Studies — only show studies that have actual content */}
                  {(() => {
                    const realStudies = getRealStudies(selected);
                    if (realStudies.length === 0) return null;
                    return (
                    <div className="space-y-3">
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Supporting Studies
                      </div>
                      <div className="space-y-2">
                        {realStudies.map((study, index) => {
                          const studyKey = `${study.name || "study"}-${index}`;
                          const isExpanded = expandedStudies[studyKey];

                          return (
                            <div key={studyKey} className="border border-border/60 rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => setExpandedStudies((prev) => ({ ...prev, [studyKey]: !prev[studyKey] }))}
                                className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-accent/50 transition-colors"
                              >
                                <div className="text-left min-w-0">
                                  <div className="text-[13px] font-medium text-foreground">
                                    {formatStudyName(study.name || "")}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    {getStudyTypeDescription(study.type) || "Assay"}
                                  </div>
                                </div>
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                )}
                              </button>
                              {isExpanded && study.description && (() => {
                                const parsed = formatStudyDescription(study.description);
                                if (!parsed) return null;
                                return (
                                  <div className="px-4 py-3 border-t border-border/60 bg-muted/30 space-y-2">
                                    <div className="text-[13px] text-muted-foreground leading-relaxed">
                                      {parsed.text}
                                    </div>
                                    {parsed.variants.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {parsed.variants.map((v) => (
                                          <span key={v} className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                            {v}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    );
                  })()}

                  {/* Biosamples */}
                  {groupedBiosamples.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Affected Tissues
                      </div>
                      <div className="space-y-3">
                        {groupedBiosamples.map(([tissue, cells]) => (
                          <div key={tissue}>
                            <div className="text-[13px] font-medium text-foreground mb-1">{tissue}</div>
                            <div className="flex flex-wrap gap-1.5">
                              {cells.map((cell) => (
                                <span
                                  key={`${tissue}-${cell}`}
                                  className="bg-muted px-2 py-0.5 text-[11px] text-muted-foreground rounded"
                                >
                                  {cell}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Literature */}
                  {literature.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        References
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {literature.map((pmid) => (
                          <ExternalLink
                            key={pmid}
                            href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}`}
                            className="text-xs text-primary hover:underline"
                          >
                            PMID {pmid}
                          </ExternalLink>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Links */}
                  {selected.url && (
                    <div className="pt-2">
                      <ExternalLink
                        href={selected.url}
                        className="text-xs text-primary hover:underline"
                      >
                        View source
                      </ExternalLink>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
