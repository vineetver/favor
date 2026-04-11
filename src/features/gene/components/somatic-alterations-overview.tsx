"use client";

import { cn } from "@infra/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@shared/components/ui/card";
import { ScopeBar } from "@shared/components/ui/data-surface/scope-bar";
import type { DimensionConfig } from "@shared/components/ui/data-surface/types";
import { NoDataState } from "@shared/components/ui/error-states";
import { ExternalLink } from "@shared/components/ui/external-link";
import { Input } from "@shared/components/ui/input";
import { Tip } from "@shared/components/ui/tip";
import { TooltipProvider } from "@shared/components/ui/tooltip";
import { ChevronDown, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SomaticAlterationsOverviewProps {
  relations?: unknown;
  edges?: unknown;
  geneSymbol?: string | null;
  className?: string;
}

type AlterationEdge = {
  id: string;
  diseaseName: string;
  diseaseSubtitle: string | null;
  alterationDomain: string | null;
  alterationType: string | null;
  geneRole: string | null;
  mutationTypes: string[];
  isCancerDriverGene: boolean;
  isCosmicCensusGene: boolean;
  alterationFrequency: number | null;
  alteredSampleCount: number | null;
  testedSampleCount: number | null;
  otScore: number | null;
  evidenceCount: number;
  confidenceClass: string | null;
  source: string | null;
  tcgaStudyId: string | null;
  tcgaCancerType: string | null;
  pubmedIds: string[];
};

// ---------------------------------------------------------------------------
// Labels & helpers
// ---------------------------------------------------------------------------

const DOMAIN_LABELS: Record<
  string,
  { label: string; tip: string; color: string }
> = {
  somatic_mutation: {
    label: "Somatic mutation",
    tip: "Point mutations, insertions, or deletions found in tumor DNA that are not inherited.",
    color: "bg-red-500",
  },
  copy_number: {
    label: "Copy number",
    tip: "Amplifications or deletions of genomic regions affecting gene dosage in tumors.",
    color: "bg-blue-500",
  },
};

const ROLE_LABELS: Record<
  string,
  { label: string; color: string; tip: string }
> = {
  oncogene: {
    label: "Oncogene",
    color: "text-red-600",
    tip: "A gene that, when mutated or amplified, drives cancer growth. Gain-of-function mutations are the typical mechanism.",
  },
  tumor_suppressor: {
    label: "Tumor suppressor",
    color: "text-blue-600",
    tip: "A gene that normally restrains cell growth. Loss-of-function mutations (deletions, truncations) remove this brake.",
  },
};

const ALTERATION_LABELS: Record<string, string> = {
  missense_variant: "Missense",
  frameshift_variant: "Frameshift",
  stop_gained: "Stop gained",
  splice_region_variant: "Splice region",
  amino_acid_insertion: "Insertion",
  sequence_alteration: "Sequence alteration",
  amplification: "Amplification",
  deletion: "Deletion",
};

function formatAlteration(raw: string | null): string {
  if (!raw) return "—";
  return (
    ALTERATION_LABELS[raw] ??
    raw.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

function formatFrequency(freq: number | null): string {
  if (freq === null) return "—";
  if (freq >= 0.01) return `${(freq * 100).toFixed(1)}%`;
  return `${(freq * 100).toFixed(2)}%`;
}

/** Horizontal frequency bar — wider = more frequent. */
function FrequencyBar({ value }: { value: number | null }) {
  if (value === null)
    return <span className="text-[11px] text-muted-foreground">—</span>;
  const percent = Math.round(Math.max(0, Math.min(1, value)) * 100);

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <span className="text-[11px] font-medium tabular-nums text-muted-foreground w-10 text-right">
        {formatFrequency(value)}
      </span>
      <div className="h-1 w-12 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full bg-foreground/25"
          style={{ width: `${Math.max(percent, 2)}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data extraction
// ---------------------------------------------------------------------------

function extractAlterationEdges(
  relations: unknown,
  edges?: unknown,
): AlterationEdge[] {
  const source = relations ?? edges;
  if (!source || typeof source !== "object") return [];

  const record = source as Record<string, unknown>;
  const byType =
    record.GENE_ALTERED_IN_DISEASE ?? record.gene_altered_in_disease;

  let rows: any[] = [];
  if (byType && typeof byType === "object") {
    const typed = byType as Record<string, unknown>;
    if (Array.isArray(typed.rows)) rows = typed.rows;
    else if (Array.isArray(byType)) rows = byType as any[];
  }

  return rows
    .map((row: any, idx: number): AlterationEdge | null => {
      const neighbor = row?.neighbor ?? row?.target ?? {};
      const link = row?.link ?? row?.edge ?? {};
      const props = link?.props ?? link ?? {};
      const rawId = neighbor?.id ?? row?.neighbor_id ?? row?.id;
      if (!rawId) return null;

      return {
        id: `${rawId}_${idx}`,
        diseaseName: String(
          props.disease_name ?? neighbor?.label ?? neighbor?.name ?? "Unknown",
        ),
        diseaseSubtitle:
          typeof neighbor?.subtitle === "string" ? neighbor.subtitle : null,
        alterationDomain: props.alteration_domain ?? null,
        alterationType: props.alteration_type ?? null,
        geneRole: props.gene_role ?? null,
        mutationTypes: Array.isArray(props.mutation_types)
          ? props.mutation_types.filter(Boolean)
          : [],
        isCancerDriverGene: props.is_cancer_driver_gene === true,
        isCosmicCensusGene: props.is_cosmic_census_gene === true,
        alterationFrequency:
          typeof props.alteration_frequency === "number"
            ? props.alteration_frequency
            : null,
        alteredSampleCount:
          typeof props.altered_sample_count === "number"
            ? props.altered_sample_count
            : null,
        testedSampleCount:
          typeof props.tested_sample_count === "number"
            ? props.tested_sample_count
            : null,
        otScore: typeof props.ot_score === "number" ? props.ot_score : null,
        evidenceCount:
          typeof props.evidence_count === "number" ? props.evidence_count : 0,
        confidenceClass: props.confidence_class ?? null,
        source: props.source ?? null,
        tcgaStudyId:
          typeof props.tcga_study_id === "string" ? props.tcga_study_id : null,
        tcgaCancerType:
          typeof props.tcga_cancer_type === "string"
            ? props.tcga_cancer_type
            : null,
        pubmedIds: Array.isArray(props.pubmed_ids) ? props.pubmed_ids : [],
      };
    })
    .filter((d): d is AlterationEdge => d !== null)
    .sort((a, b) => {
      // Sort by frequency (highest first), then OT score
      const freqDiff =
        (b.alterationFrequency ?? -1) - (a.alterationFrequency ?? -1);
      if (freqDiff !== 0) return freqDiff;
      return (b.otScore ?? -1) - (a.otScore ?? -1);
    });
}

// ---------------------------------------------------------------------------
// Progressive rendering
// ---------------------------------------------------------------------------
const PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function SomaticAlterationsOverview({
  relations,
  edges,
  geneSymbol,
  className,
}: SomaticAlterationsOverviewProps) {
  const [domainFilter, setDomainFilter] = useState("all");
  const [confidenceFilter, setConfidenceFilter] = useState("all");
  const [sortMode, setSortMode] = useState("frequency-desc");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const alterations = useMemo(
    () => extractAlterationEdges(relations, edges),
    [relations, edges],
  );

  // Compute summary stats
  const summary = useMemo(() => {
    const isCancerDriver = alterations.some((a) => a.isCancerDriverGene);
    const geneRole = alterations.find((a) => a.geneRole)?.geneRole ?? null;
    const uniqueDiseases = new Set(alterations.map((a) => a.diseaseName)).size;
    const maxFreq = Math.max(
      ...alterations.map((a) => a.alterationFrequency ?? 0),
    );
    return { isCancerDriver, geneRole, uniqueDiseases, maxFreq };
  }, [alterations]);

  const domainOptions = useMemo(() => {
    const domains = new Set<string>();
    alterations.forEach((a) => {
      if (a.alterationDomain) domains.add(a.alterationDomain);
    });
    return [{ value: "all", label: "All" }].concat(
      Array.from(domains)
        .sort()
        .map((d) => ({
          value: d,
          label: DOMAIN_LABELS[d]?.label ?? d.replace(/_/g, " "),
        })),
    );
  }, [alterations]);

  const dimensions = useMemo<DimensionConfig[]>(
    () => [
      ...(domainOptions.length > 2
        ? [
            {
              label: "Alteration type",
              value: domainFilter,
              onChange: setDomainFilter,
              options: domainOptions,
            },
          ]
        : []),
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
          { value: "frequency-desc", label: "Frequency" },
          { value: "score-desc", label: "Score" },
          { value: "alpha", label: "A-Z" },
        ],
        presentation: "segmented" as const,
      },
    ],
    [domainFilter, domainOptions, confidenceFilter, sortMode],
  );

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return alterations.filter((a) => {
      if (domainFilter !== "all" && a.alterationDomain !== domainFilter)
        return false;
      if (confidenceFilter === "high" && a.confidenceClass !== "high")
        return false;
      if (
        confidenceFilter === "medium" &&
        a.confidenceClass !== "high" &&
        a.confidenceClass !== "medium"
      )
        return false;
      if (query.length > 0) {
        const matches =
          a.diseaseName.toLowerCase().includes(query) ||
          a.tcgaCancerType?.toLowerCase().includes(query) ||
          a.alterationType?.toLowerCase().includes(query);
        if (!matches) return false;
      }
      return true;
    });
  }, [alterations, search, domainFilter, confidenceFilter]);

  const sorted = useMemo(() => {
    const items = [...filtered];
    if (sortMode === "alpha")
      return items.sort((a, b) => a.diseaseName.localeCompare(b.diseaseName));
    if (sortMode === "score-desc") {
      return items.sort((a, b) => {
        const diff = (b.otScore ?? -1) - (a.otScore ?? -1);
        return diff !== 0 ? diff : a.diseaseName.localeCompare(b.diseaseName);
      });
    }
    return items; // already sorted by frequency
  }, [filtered, sortMode]);

  const visible = useMemo(
    () => sorted.slice(0, visibleCount),
    [sorted, visibleCount],
  );
  const hasMore = sorted.length > visibleCount;

  // Group by domain
  const grouped = useMemo(() => {
    const map = new Map<string, AlterationEdge[]>();
    for (const a of visible) {
      const key = DOMAIN_LABELS[a.alterationDomain ?? ""]?.label ?? "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(a);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [visible]);

  useEffect(() => {
    if (sorted.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !sorted.some((a) => a.id === selectedId)) {
      setSelectedId(sorted[0].id);
    }
  }, [sorted, selectedId]);

  const selected = useMemo(
    () => sorted.find((a) => a.id === selectedId) ?? sorted[0] ?? null,
    [sorted, selectedId],
  );

  const showMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  if (!alterations.length) {
    return (
      <NoDataState
        categoryName="Somatic Alterations"
        description={`No somatic alteration data is available for ${geneSymbol ?? "this gene"}.`}
      />
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Card className={cn("border border-border py-0 gap-0", className)}>
        <CardHeader className="border-b border-border px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-3">
                <CardTitle className="text-sm font-semibold text-foreground">
                  Somatic Alterations
                </CardTitle>
                {/* Summary badges */}
                <div className="flex items-center gap-2">
                  {summary.isCancerDriver && (
                    <Tip content="This gene is classified as a cancer driver in the COSMIC Cancer Gene Census.">
                      <span className="inline-flex items-center rounded bg-red-500/10 px-2 py-0.5 text-[11px] text-red-600 font-medium">
                        Cancer driver
                      </span>
                    </Tip>
                  )}
                  {summary.geneRole && ROLE_LABELS[summary.geneRole] && (
                    <Tip content={ROLE_LABELS[summary.geneRole].tip}>
                      <span
                        className={cn(
                          "text-[11px] font-medium",
                          ROLE_LABELS[summary.geneRole].color,
                        )}
                      >
                        {ROLE_LABELS[summary.geneRole].label}
                      </span>
                    </Tip>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {filtered.length === alterations.length
                  ? `${alterations.length} alterations across ${summary.uniqueDiseases} cancer types`
                  : `${filtered.length} of ${alterations.length} alterations`}{" "}
                for {geneSymbol ?? "this gene"}
              </div>
            </div>
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground z-10" />
              <Input
                type="text"
                placeholder="Search cancer types..."
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
            {/* ── Alteration List ── */}
            <div className="border-b border-border lg:border-b-0 lg:border-r border-r-border">
              <div className="max-h-[600px] overflow-y-auto">
                {grouped.length === 0 && (
                  <div className="px-5 py-8 text-xs text-muted-foreground text-center">
                    No alterations match your filters.
                  </div>
                )}
                {grouped.map(([group, items]) => (
                  <div key={group}>
                    <div className="px-5 py-1.5 border-b border-border bg-muted sticky top-0 z-10">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        {group}
                        <span className="ml-1 text-muted-foreground/60">
                          {items.length}
                        </span>
                      </span>
                    </div>
                    {items.map((a) => {
                      const isSelected = a.id === selectedId;
                      const domain = DOMAIN_LABELS[a.alterationDomain ?? ""];

                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setSelectedId(a.id)}
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
                                {a.diseaseName}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1">
                                {domain && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <span
                                      className={cn(
                                        "h-1.5 w-1.5 rounded-full shrink-0",
                                        domain.color,
                                      )}
                                    />
                                    {formatAlteration(a.alterationType)}
                                  </span>
                                )}
                                {a.tcgaCancerType && (
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {a.tcgaCancerType}
                                  </span>
                                )}
                              </div>
                            </div>
                            <FrequencyBar value={a.alterationFrequency} />
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
                <span className="text-[11px] font-medium text-muted-foreground">
                  Details
                </span>
              </div>
              <div className="px-5 py-5 max-h-[600px] overflow-y-auto">
                {!selected && (
                  <div className="text-xs text-muted-foreground">
                    Select an alteration to view details.
                  </div>
                )}

                {selected && (
                  <div className="space-y-5">
                    {/* ─ Title ─ */}
                    <div className="space-y-2">
                      <h3 className="text-[15px] font-semibold text-foreground leading-snug">
                        {selected.diseaseName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {selected.alterationDomain &&
                          DOMAIN_LABELS[selected.alterationDomain] && (
                            <Tip
                              content={
                                DOMAIN_LABELS[selected.alterationDomain].tip
                              }
                            >
                              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span
                                  className={cn(
                                    "h-2 w-2 rounded-full shrink-0",
                                    DOMAIN_LABELS[selected.alterationDomain]
                                      .color,
                                  )}
                                />
                                {DOMAIN_LABELS[selected.alterationDomain].label}
                              </span>
                            </Tip>
                          )}
                        {selected.geneRole &&
                          ROLE_LABELS[selected.geneRole] && (
                            <Tip content={ROLE_LABELS[selected.geneRole].tip}>
                              <span
                                className={cn(
                                  "text-xs font-medium",
                                  ROLE_LABELS[selected.geneRole].color,
                                )}
                              >
                                {ROLE_LABELS[selected.geneRole].label}
                              </span>
                            </Tip>
                          )}
                        {selected.isCancerDriverGene && (
                          <span className="text-xs text-red-600">
                            Cancer driver
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ─ Key metrics ─ */}
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      <div>
                        <Tip content="Fraction of tested tumor samples harboring this alteration in this gene for this cancer type.">
                          <span className="text-[11px] text-muted-foreground">
                            Alteration frequency
                          </span>
                        </Tip>
                        <div className="text-sm font-semibold text-foreground tabular-nums">
                          {formatFrequency(selected.alterationFrequency)}
                        </div>
                      </div>
                      {selected.alteredSampleCount !== null && (
                        <div>
                          <Tip content="Number of tumor samples with this gene alteration out of total tested samples.">
                            <span className="text-[11px] text-muted-foreground">
                              Samples
                            </span>
                          </Tip>
                          <div className="text-sm font-semibold text-foreground tabular-nums">
                            {selected.alteredSampleCount.toLocaleString()}
                            {selected.testedSampleCount !== null && (
                              <span className="text-[11px] text-muted-foreground font-normal ml-1">
                                / {selected.testedSampleCount.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                      {selected.otScore !== null && (
                        <div>
                          <Tip content="OpenTargets evidence score for somatic mutation evidence linking this gene to this cancer (0–1).">
                            <span className="text-[11px] text-muted-foreground">
                              OT score
                            </span>
                          </Tip>
                          <div className="text-sm font-semibold text-foreground tabular-nums">
                            {selected.otScore.toFixed(2)}
                          </div>
                        </div>
                      )}
                      {selected.evidenceCount > 0 && (
                        <div>
                          <span className="text-[11px] text-muted-foreground">
                            Evidence
                          </span>
                          <div className="text-sm font-semibold text-foreground tabular-nums">
                            {selected.evidenceCount}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ─ Description ─ */}
                    {selected.diseaseSubtitle && (
                      <p className="text-[13px] text-muted-foreground leading-relaxed">
                        {selected.diseaseSubtitle.length > 300
                          ? `${selected.diseaseSubtitle.slice(0, 300)}...`
                          : selected.diseaseSubtitle}
                      </p>
                    )}

                    {/* ─ Alteration details ─ */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                        Alteration details
                      </span>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        {selected.alterationType && (
                          <div>
                            <span className="text-[11px] text-muted-foreground">
                              Type
                            </span>
                            <div className="text-[13px] text-foreground">
                              {formatAlteration(selected.alterationType)}
                            </div>
                          </div>
                        )}
                        {selected.source && (
                          <div>
                            <span className="text-[11px] text-muted-foreground">
                              Source
                            </span>
                            <div className="text-[13px] text-foreground">
                              {selected.source}
                            </div>
                          </div>
                        )}
                        {selected.tcgaStudyId && (
                          <div>
                            <Tip content="TCGA (The Cancer Genome Atlas) study accession for this cancer cohort.">
                              <span className="text-[11px] text-muted-foreground">
                                TCGA study
                              </span>
                            </Tip>
                            <div className="text-[13px] text-foreground font-mono">
                              {selected.tcgaStudyId}
                            </div>
                          </div>
                        )}
                        {selected.tcgaCancerType && (
                          <div>
                            <span className="text-[11px] text-muted-foreground">
                              TCGA cancer type
                            </span>
                            <div className="text-[13px] text-foreground font-mono">
                              {selected.tcgaCancerType}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ─ Mutation types ─ */}
                    {selected.mutationTypes.length > 0 && (
                      <div className="space-y-1.5">
                        <Tip content="Sequence Ontology terms describing the types of mutations observed for this gene in this cancer.">
                          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                            Mutation types
                          </span>
                        </Tip>
                        <div className="flex flex-wrap gap-1">
                          {selected.mutationTypes.map((mt) => (
                            <span
                              key={mt}
                              className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                            >
                              {formatAlteration(mt)}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ─ Links ─ */}
                    <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-border/60">
                      {selected.pubmedIds.slice(0, 3).map((pmid) => (
                        <ExternalLink
                          key={pmid}
                          href={`https://pubmed.ncbi.nlm.nih.gov/${pmid}`}
                          className="text-xs text-primary hover:underline"
                        >
                          PubMed {pmid}
                        </ExternalLink>
                      ))}
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
