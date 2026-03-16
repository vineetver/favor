"use client";

import { cn } from "@infra/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { NoDataState } from "@shared/components/ui/error-states";
import { ExternalLink } from "@shared/components/ui/external-link";
import { Input } from "@shared/components/ui/input";
import { ScopeBar } from "@shared/components/ui/data-surface/scope-bar";
import type { DimensionConfig } from "@shared/components/ui/data-surface/types";
import { TooltipProvider } from "@shared/components/ui/tooltip";
import { Tip } from "@shared/components/ui/tip";
import { ConfidenceDots } from "@shared/components/ui/confidence-dots";
import { Search, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PhenotypeSignatureOverviewProps {
  relations?: unknown;
  edges?: unknown;
  geneSymbol?: string | null;
  className?: string;
}

type PhenotypeEdge = {
  id: string;
  /** Original phenotype ID from the graph, e.g. "HP_0000006" */
  termId: string;
  phenotypeName: string;
  phenotypeDescription: string | null;
  evidenceOrigin: string | null;
  evidenceCode: string | null;
  phenotypeFrequency: string | null;
  confidenceClass: string | null;
  evidenceCount: number;
  modelOrganism: string | null;
  modelOrganismGeneSymbol: string | null;
  ontologySource: string | null;
};

// ---------------------------------------------------------------------------
// Labels & helpers
// ---------------------------------------------------------------------------

const EVIDENCE_CODES: Record<string, { label: string; tip: string; rank: number }> = {
  PCS: {
    label: "Published clinical study",
    tip: "Phenotype observed in a published clinical study with individual patient data.",
    rank: 3,
  },
  TAS: {
    label: "Traceable author statement",
    tip: "Author statement in a published paper that can be traced to the original study.",
    rank: 2,
  },
  IEA: {
    label: "Inferred from electronic annotation",
    tip: "Computationally inferred association — not yet manually reviewed.",
    rank: 1,
  },
};

// HPO frequency terms: https://hpo.jax.org/browse/term/HP:0040279
const FREQUENCY_LABELS: Record<string, { label: string; short: string; tip: string; rank: number }> = {
  "HP:0040280": {
    label: "Obligate (100%)",
    short: "100%",
    tip: "This phenotype is present in all affected individuals.",
    rank: 6,
  },
  "HP:0040281": {
    label: "Very frequent (80–99%)",
    short: "80–99%",
    tip: "This phenotype is present in 80% to 99% of affected individuals.",
    rank: 5,
  },
  "HP:0040282": {
    label: "Frequent (30–79%)",
    short: "30–79%",
    tip: "This phenotype is present in 30% to 79% of affected individuals.",
    rank: 4,
  },
  "HP:0040283": {
    label: "Occasional (5–29%)",
    short: "5–29%",
    tip: "This phenotype is present in 5% to 29% of affected individuals.",
    rank: 3,
  },
  "HP:0040284": {
    label: "Very rare (<5%)",
    short: "<5%",
    tip: "This phenotype is present in fewer than 5% of affected individuals.",
    rank: 2,
  },
  "HP:0040285": {
    label: "Excluded (0%)",
    short: "0%",
    tip: "This phenotype has been explicitly excluded in affected individuals.",
    rank: 1,
  },
};

const CONFIDENCE: Record<string, { dots: number; label: string; tip: string }> = {
  high: {
    dots: 3,
    label: "Strong evidence",
    tip: "Multiple independent clinical observations confirm this phenotype for this gene.",
  },
  medium: {
    dots: 2,
    label: "Moderate evidence",
    tip: "Supported by author statements or limited clinical data.",
  },
  low: {
    dots: 1,
    label: "Preliminary",
    tip: "Inferred from model organisms or computational methods. Needs clinical validation.",
  },
};

const ORIGIN_LABELS: Record<string, { label: string; short: string; dot: string }> = {
  human_clinical: {
    label: "Human clinical",
    short: "Human",
    dot: "bg-blue-500",
  },
  mouse_model: {
    label: "Mouse model",
    short: "Mouse",
    dot: "bg-amber-500",
  },
};

function frequencyLabel(raw: string | null): { label: string; short: string; tip: string } | null {
  if (!raw) return null;
  if (FREQUENCY_LABELS[raw]) return FREQUENCY_LABELS[raw];
  // Handle raw fractions like "1/1" or "0/1"
  if (raw.includes("/")) return { label: raw, short: raw, tip: `Observed frequency: ${raw}` };
  return null;
}

// ---------------------------------------------------------------------------
// Data extraction
// ---------------------------------------------------------------------------

function extractPhenotypeEdges(relations: unknown, edges?: unknown): PhenotypeEdge[] {
  const source = relations ?? edges;
  if (!source || typeof source !== "object") return [];

  const record = source as Record<string, unknown>;
  const byType =
    record.GENE_ASSOCIATED_WITH_PHENOTYPE ??
    record.gene_associated_with_phenotype;

  let rows: any[] = [];
  if (byType && typeof byType === "object") {
    const typed = byType as Record<string, unknown>;
    if (Array.isArray(typed.rows)) rows = typed.rows;
    else if (Array.isArray(byType)) rows = byType as any[];
  }

  return rows
    .map((row: any, idx: number): PhenotypeEdge | null => {
      const neighbor = row?.neighbor ?? row?.target ?? {};
      const link = row?.link ?? row?.edge ?? {};
      const props = link?.props ?? link ?? {};
      const rawId = neighbor?.id ?? row?.neighbor_id ?? row?.id;
      if (!rawId) return null;

      return {
        id: `${rawId}_${idx}`,
        termId: String(rawId),
        phenotypeName: String(props.phenotype_name ?? neighbor?.label ?? neighbor?.name ?? "Unknown"),
        phenotypeDescription: typeof (neighbor?.subtitle ?? props.phenotype_description) === "string"
          ? (neighbor?.subtitle ?? props.phenotype_description) : null,
        evidenceOrigin: props.evidence_origin ?? null,
        evidenceCode: props.evidence_code ?? null,
        phenotypeFrequency: props.phenotype_frequency ?? null,
        confidenceClass: props.confidence_class ?? null,
        evidenceCount: typeof props.evidence_count === "number" ? props.evidence_count : 0,
        modelOrganism: props.model_organism ?? null,
        modelOrganismGeneSymbol: props.model_organism_gene_symbol ?? null,
        ontologySource: props.ontology_source ?? null,
      };
    })
    .filter((d): d is PhenotypeEdge => d !== null)
    .sort((a, b) => {
      // High confidence first, then by evidence count
      const confRank = (c: string | null) => c === "high" ? 3 : c === "medium" ? 2 : 1;
      const confDiff = confRank(b.confidenceClass) - confRank(a.confidenceClass);
      if (confDiff !== 0) return confDiff;
      return b.evidenceCount - a.evidenceCount;
    });
}

// ---------------------------------------------------------------------------
// Progressive rendering
// ---------------------------------------------------------------------------
const PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function PhenotypeSignatureOverview({
  relations,
  edges,
  geneSymbol,
  className,
}: PhenotypeSignatureOverviewProps) {
  const [originFilter, setOriginFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [sortMode, setSortMode] = useState("confidence-desc");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const phenotypes = useMemo(() => extractPhenotypeEdges(relations, edges), [relations, edges]);

  // Summary counts
  const summary = useMemo(() => {
    const human = phenotypes.filter((p) => p.evidenceOrigin === "human_clinical").length;
    const mouse = phenotypes.filter((p) => p.evidenceOrigin === "mouse_model").length;
    return { human, mouse };
  }, [phenotypes]);

  const dimensions = useMemo<DimensionConfig[]>(
    () => [
      {
        label: "Species",
        value: originFilter,
        onChange: setOriginFilter,
        options: [
          { value: "all", label: "All" },
          ...(summary.human > 0 ? [{ value: "human_clinical", label: `Human (${summary.human})` }] : []),
          ...(summary.mouse > 0 ? [{ value: "mouse_model", label: `Mouse (${summary.mouse})` }] : []),
        ],
      },
      {
        label: "Confidence",
        value: confidenceFilter,
        onChange: setConfidenceFilter,
        options: [
          { value: "all", label: "Any" },
          { value: "high", label: "High" },
          { value: "medium", label: "Medium+" },
        ],
      },
      {
        label: "Sort",
        value: sortMode,
        onChange: setSortMode,
        options: [
          { value: "confidence-desc", label: "Confidence" },
          { value: "evidence-desc", label: "Evidence" },
          { value: "alpha", label: "A-Z" },
        ],
        presentation: "segmented" as const,
      },
    ],
    [originFilter, confidenceFilter, sortMode, summary],
  );

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, originFilter, confidenceFilter, sortMode]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return phenotypes.filter((p) => {
      if (originFilter !== "all" && p.evidenceOrigin !== originFilter) return false;
      if (confidenceFilter === "high" && p.confidenceClass !== "high") return false;
      if (confidenceFilter === "medium" && p.confidenceClass !== "high" && p.confidenceClass !== "medium") return false;
      if (query.length > 0) {
        const matches =
          p.phenotypeName.toLowerCase().includes(query) ||
          p.phenotypeDescription?.toLowerCase().includes(query);
        if (!matches) return false;
      }
      return true;
    });
  }, [phenotypes, search, originFilter, confidenceFilter]);

  const sorted = useMemo(() => {
    const items = [...filtered];
    if (sortMode === "alpha") return items.sort((a, b) => a.phenotypeName.localeCompare(b.phenotypeName));
    if (sortMode === "evidence-desc") {
      return items.sort((a, b) => {
        const diff = b.evidenceCount - a.evidenceCount;
        return diff !== 0 ? diff : a.phenotypeName.localeCompare(b.phenotypeName);
      });
    }
    return items; // already sorted by confidence
  }, [filtered, sortMode]);

  const visible = useMemo(() => sorted.slice(0, visibleCount), [sorted, visibleCount]);
  const hasMore = sorted.length > visibleCount;

  // Group by origin
  const grouped = useMemo(() => {
    const map = new Map<string, PhenotypeEdge[]>();
    for (const p of visible) {
      const key = ORIGIN_LABELS[p.evidenceOrigin ?? ""]?.label ?? "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    // Human clinical first
    const entries = Array.from(map.entries());
    entries.sort((a) => a[0] === "Human clinical" ? -1 : 1);
    return entries;
  }, [visible]);

  useEffect(() => {
    if (sorted.length === 0) { setSelectedId(null); return; }
    if (!selectedId || !sorted.some((p) => p.id === selectedId)) {
      setSelectedId(sorted[0].id);
    }
  }, [sorted, selectedId]);

  const selected = useMemo(
    () => sorted.find((p) => p.id === selectedId) ?? sorted[0] ?? null,
    [sorted, selectedId],
  );

  const showMore = useCallback(() => { setVisibleCount((prev) => prev + PAGE_SIZE); }, []);

  if (!phenotypes.length) {
    return (
      <NoDataState
        categoryName="Phenotype Signature"
        description={`No phenotype associations are available for ${geneSymbol ?? "this gene"}.`}
      />
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Card className={cn("border border-border py-0 gap-0", className)}>
        <CardHeader className="border-b border-border px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-semibold text-foreground">
                Phenotype Signature
              </CardTitle>
              <div className="text-xs text-muted-foreground">
                {filtered.length === phenotypes.length
                  ? <>{summary.human} human phenotypes{summary.mouse > 0 && <>, {summary.mouse} from mouse models</>}</>
                  : <>{filtered.length} of {phenotypes.length} phenotypes</>
                } for {geneSymbol ?? "this gene"}
              </div>
            </div>
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground z-10" />
              <Input
                type="text"
                placeholder="Search phenotypes..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="border-b border-border bg-muted/40">
            <ScopeBar dimensions={dimensions} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr]">
            {/* ── Phenotype List ── */}
            <div className="border-b border-border lg:border-b-0 lg:border-r border-r-border">
              <div className="max-h-[600px] overflow-y-auto">
                {grouped.length === 0 && (
                  <div className="px-5 py-8 text-xs text-muted-foreground text-center">
                    No phenotypes match your filters.
                  </div>
                )}
                {grouped.map(([group, items]) => (
                  <div key={group}>
                    <div className="px-5 py-1.5 border-b border-border bg-muted sticky top-0 z-10">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {group}
                        <span className="ml-1 text-muted-foreground/60">{items.length}</span>
                      </span>
                    </div>
                    {items.map((p) => {
                      const isSelected = p.id === selectedId;
                      const origin = ORIGIN_LABELS[p.evidenceOrigin ?? ""];
                      const conf = CONFIDENCE[p.confidenceClass ?? ""];
                      const freq = frequencyLabel(p.phenotypeFrequency);

                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setSelectedId(p.id)}
                          className={cn(
                            "w-full px-5 py-2.5 text-left transition-colors",
                            "border-b border-border/60",
                            "hover:bg-accent/50",
                            isSelected && "bg-accent/70",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-[13px] font-medium text-foreground leading-snug line-clamp-2">
                                {p.phenotypeName}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                {origin && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", origin.dot)} />
                                    {origin.short}
                                  </span>
                                )}
                                {freq && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {freq.short}
                                  </span>
                                )}
                              </div>
                            </div>
                            {conf && (
                              <div className="shrink-0 mt-1">
                                <ConfidenceDots count={conf.dots} />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ))}
                {hasMore && (
                  <button
                    type="button"
                    onClick={showMore}
                    className="w-full px-5 py-3 text-center text-xs text-primary hover:bg-accent/50 transition-colors flex items-center justify-center gap-1"
                  >
                    <ChevronDown className="h-3 w-3" />
                    Show more ({sorted.length - visibleCount} remaining)
                  </button>
                )}
              </div>
            </div>

            {/* ── Detail Panel ── */}
            <div>
              <div className="px-5 py-1.5 border-b border-border bg-muted/60">
                <span className="text-[11px] font-medium text-muted-foreground">Details</span>
              </div>
              <div className="px-5 py-5 max-h-[600px] overflow-y-auto">
                {!selected && (
                  <div className="text-xs text-muted-foreground">
                    Select a phenotype to view details.
                  </div>
                )}

                {selected && (
                  <div className="space-y-5">
                    {/* ─ Title ─ */}
                    <div className="space-y-2">
                      <h3 className="text-[15px] font-semibold text-foreground leading-snug">
                        {selected.phenotypeName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {selected.evidenceOrigin && ORIGIN_LABELS[selected.evidenceOrigin] && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className={cn("h-2 w-2 rounded-full shrink-0", ORIGIN_LABELS[selected.evidenceOrigin].dot)} />
                            {ORIGIN_LABELS[selected.evidenceOrigin].label}
                          </span>
                        )}
                        {selected.confidenceClass && CONFIDENCE[selected.confidenceClass] && (
                          <Tip content={CONFIDENCE[selected.confidenceClass].tip}>
                            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                              <ConfidenceDots count={CONFIDENCE[selected.confidenceClass].dots} />
                              {CONFIDENCE[selected.confidenceClass].label}
                            </span>
                          </Tip>
                        )}
                      </div>
                    </div>

                    {/* ─ Key metrics ─ */}
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {selected.evidenceCount > 0 && (
                        <div>
                          <Tip content="Number of independent diseases linking this gene to this phenotype.">
                            <span className="text-[11px] text-muted-foreground">Evidence count</span>
                          </Tip>
                          <div className="text-sm font-semibold text-foreground tabular-nums">
                            {selected.evidenceCount}
                          </div>
                        </div>
                      )}
                      {selected.evidenceCode && EVIDENCE_CODES[selected.evidenceCode] && (
                        <div>
                          <Tip content={EVIDENCE_CODES[selected.evidenceCode].tip}>
                            <span className="text-[11px] text-muted-foreground">Evidence type</span>
                          </Tip>
                          <div className="text-sm font-semibold text-foreground">
                            {EVIDENCE_CODES[selected.evidenceCode].label}
                          </div>
                        </div>
                      )}
                      {(() => {
                        const freq = frequencyLabel(selected.phenotypeFrequency);
                        if (!freq) return null;
                        return (
                          <div>
                            <Tip content={freq.tip}>
                              <span className="text-[11px] text-muted-foreground">Frequency in patients</span>
                            </Tip>
                            <div className="text-sm font-semibold text-foreground">
                              {freq.label}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* ─ Description ─ */}
                    {selected.phenotypeDescription && (
                      <p className="text-[13px] text-muted-foreground leading-relaxed">
                        {selected.phenotypeDescription.length > 400
                          ? `${selected.phenotypeDescription.slice(0, 400)}...`
                          : selected.phenotypeDescription}
                      </p>
                    )}

                    {/* ─ Model organism ─ */}
                    {selected.modelOrganism && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                          Model organism
                        </span>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                          <div>
                            <span className="text-[11px] text-muted-foreground">Species</span>
                            <div className="text-[13px] text-foreground italic">{selected.modelOrganism}</div>
                          </div>
                          {selected.modelOrganismGeneSymbol && (
                            <div>
                              <span className="text-[11px] text-muted-foreground">Ortholog</span>
                              <div className="text-[13px] text-foreground font-mono">{selected.modelOrganismGeneSymbol}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ─ Ontology info ─ */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Ontology
                      </span>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        {selected.ontologySource && (
                          <div>
                            <Tip content={
                              selected.ontologySource === "HP"
                                ? "Human Phenotype Ontology — standardized vocabulary for human clinical phenotypes."
                                : selected.ontologySource === "MP"
                                  ? "Mammalian Phenotype Ontology — standardized vocabulary for phenotypes observed in model organisms."
                                  : `Ontology source: ${selected.ontologySource}`
                            }>
                              <span className="text-[11px] text-muted-foreground">Source ontology</span>
                            </Tip>
                            <div className="text-[13px] text-foreground">
                              {selected.ontologySource === "HP" ? "Human Phenotype Ontology (HPO)" :
                               selected.ontologySource === "MP" ? "Mammalian Phenotype Ontology (MP)" :
                               selected.ontologySource}
                            </div>
                          </div>
                        )}
                        <div>
                          <span className="text-[11px] text-muted-foreground">Term ID</span>
                          <div className="text-[13px] text-foreground font-mono">
                            {selected.termId.replace("_", ":")}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ─ Links ─ */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/60">
                      {selected.ontologySource === "HP" && (
                        <ExternalLink
                          href={`https://hpo.jax.org/browse/term/${selected.termId.replace("_", ":")}`}
                          className="text-xs text-primary hover:underline"
                        >
                          HPO Browser
                        </ExternalLink>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
