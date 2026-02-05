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
import { Chip, LinkChip } from "@shared/components/ui/status-badge";
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

const DIRECTION_CONFIG: Record<DirectionCategory, { label: string; icon: string; className: string }> = {
  increase: { label: "Increases risk", icon: "↑", className: "bg-destructive/10 text-destructive" },
  decrease: { label: "Decreases risk", icon: "↓", className: "bg-success/10 text-success" },
  mixed: { label: "Variable", icon: "↔", className: "bg-warning/10 text-warning" },
  unknown: { label: "Unknown", icon: "?", className: "bg-muted text-muted-foreground" },
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

  // Count with studies
  const withStudiesCount = useMemo(() => {
    return (liabilities ?? []).filter((l) => (l.studies?.length ?? 0) > 0).length;
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
        const hasStudies = (item.studies?.length ?? 0) > 0;
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
      <CardHeader className="border-b border-border px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-sm font-semibold text-foreground">
              Safety Liabilities
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              Known adverse effects when this target is modulated
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
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
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr]">
          {/* Event List */}
          <div className="border-b border-border lg:border-b-0 lg:border-r">
            <div className="max-h-[520px] overflow-y-auto">
              {filteredLiabilities.length === 0 ? (
                <div className="px-6 py-8 text-body-sm text-subtle">
                  No events match your filters.
                </div>
              ) : (
                filteredLiabilities.map(({ item, index }) => {
                  const key = getLiabilityKey(item, index);
                  const isSelected = selectedKey === key;
                  const direction = getDirectionSummary(item.effects);
                  const config = DIRECTION_CONFIG[direction];

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
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-heading truncate">
                            {item.event || "Unnamed event"}
                          </div>
                          {item.studies && item.studies.length > 0 && (
                            <div className="text-body-sm text-subtle">
                              {item.studies.length} {item.studies.length === 1 ? "study" : "studies"}
                            </div>
                          )}
                        </div>
                        <span className={cn(
                          "inline-flex items-center justify-center w-6 h-6 rounded text-body-sm font-medium shrink-0",
                          config.className
                        )}>
                          {direction !== "unknown" ? config.icon : "—"}
                        </span>
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
                  Select an event to view details.
                </div>
              ) : (
                <>
                  {/* Event Header */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-heading">
                        {selected.event || "Unnamed event"}
                      </h3>
                      {(() => {
                        const direction = getDirectionSummary(selected.effects);
                        const config = DIRECTION_CONFIG[direction];
                        return (
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded text-body-sm font-medium",
                            config.className
                          )}>
                            {direction !== "unknown" && <span>{config.icon}</span>}
                            <span>{config.label}</span>
                          </span>
                        );
                      })()}
                    </div>
                    {selected.datasource && (
                      <div className="text-sm text-subtle">
                        Source: {selected.datasource}
                      </div>
                    )}
                  </div>

                  {/* Effects */}
                  {selectedEffects.length > 0 && (
                    <div className="space-y-3">
                      <div>
                        <div className="text-body-sm font-medium text-subtle">Effects</div>
                        <div className="text-caption text-subtle">How target modulation affects this liability</div>
                      </div>
                      <div className="space-y-2">
                        {selectedEffects.map((effect, index) => (
                          <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted">
                            <span className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded text-body-sm font-medium shrink-0",
                              DIRECTION_CONFIG[effect.category].className
                            )}>
                              {DIRECTION_CONFIG[effect.category].icon} {effect.direction}
                            </span>
                            <div className="text-sm text-subtle">
                              <span className="text-body">{effect.dosing}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Studies */}
                  {selected.studies && selected.studies.length > 0 && (
                    <div className="space-y-3">
                      <div>
                        <div className="text-body-sm font-medium text-subtle">Supporting Studies</div>
                        <div className="text-caption text-subtle">Evidence from experimental or clinical research</div>
                      </div>
                      <div className="space-y-2">
                        {selected.studies.map((study, index) => {
                          const studyKey = `${study.name || "study"}-${index}`;
                          const isExpanded = expandedStudies[studyKey];

                          return (
                            <div key={studyKey} className="border border-border rounded-lg overflow-hidden">
                              <button
                                type="button"
                                onClick={() => setExpandedStudies((prev) => ({ ...prev, [studyKey]: !prev[studyKey] }))}
                                className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-muted transition-colors"
                              >
                                <div className="text-left min-w-0">
                                  <div className="text-sm font-medium text-heading">
                                    {formatStudyName(study.name || "")}
                                  </div>
                                  <div className="text-body-sm text-subtle">
                                    {getStudyTypeDescription(study.type) || "Assay"}
                                  </div>
                                </div>
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-subtle shrink-0" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-subtle shrink-0" />
                                )}
                              </button>
                              {isExpanded && (
                                <div className="px-4 py-3 border-t border-border bg-muted/50 space-y-2">
                                  {study.name && (
                                    <div className="text-caption text-subtle font-mono">
                                      ID: {study.name}
                                    </div>
                                  )}
                                  {study.description && (
                                    <div className="text-sm text-body leading-relaxed">
                                      {study.description}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Biosamples */}
                  {groupedBiosamples.length > 0 && (
                    <div className="space-y-3">
                      <div>
                        <div className="text-body-sm font-medium text-subtle">Affected Tissues</div>
                        <div className="text-caption text-subtle">Where this safety concern has been observed</div>
                      </div>
                      <div className="space-y-3">
                        {groupedBiosamples.map(([tissue, cells]) => (
                          <div key={tissue}>
                            <div className="text-sm font-medium text-heading mb-1">{tissue}</div>
                            <div className="flex flex-wrap gap-1.5">
                              {cells.map((cell) => (
                                <Chip key={`${tissue}-${cell}`}>{cell}</Chip>
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
                      <div>
                        <div className="text-body-sm font-medium text-subtle">References</div>
                        <div className="text-caption text-subtle">Published literature supporting this finding</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {literature.map((pmid) => (
                          <LinkChip key={pmid} href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}`}>
                            PMID {pmid}
                          </LinkChip>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Links */}
                  {selected.url && (
                    <div className="pt-2">
                      <ExternalLink
                        href={selected.url}
                        className="text-sm text-primary hover:underline"
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
