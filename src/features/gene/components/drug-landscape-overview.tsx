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
import { Search, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DrugLandscapeOverviewProps {
  relations?: unknown;
  edges?: unknown;
  geneSymbol?: string | null;
  className?: string;
}

type DrugEdge = {
  id: string;
  drugName: string;
  drugDescription: string | null;
  actionType: string | null;
  mechanismOfAction: string | null;
  receptorFamily: string | null;
  targetName: string | null;
  bindingAffinity: number | null;
  bindingAssayType: string | null;
  maxClinicalPhase: number | null;
  isPrimaryTarget: boolean | null;
  targetDevelopmentLevel: string | null;
  diseaseNames: string[];
  confidenceClass: string | null;
  evidenceCount: number;
  sources: string[];
  numSources: number;
  pubmedIds: string[];
  // Disposition fields (for DRUG_DISPOSITION_BY_GENE edges)
  dispositionType: string | null;
  edgeType: "acts_on" | "disposition";
};

// ---------------------------------------------------------------------------
// Labels & helpers
// ---------------------------------------------------------------------------

const ACTION_COLORS: Record<string, string> = {
  INHIBITOR: "bg-blue-500",
  ANTAGONIST: "bg-blue-400",
  AGONIST: "bg-emerald-500",
  PARTIAL_AGONIST: "bg-emerald-400",
  MODULATOR: "bg-amber-500",
  BLOCKER: "bg-red-400",
  OPENER: "bg-teal-500",
};

const PHASE_LABELS: Record<number, { label: string; color: string }> = {
  4: { label: "Approved", color: "text-emerald-600" },
  3: { label: "Phase III", color: "text-blue-600" },
  2: { label: "Phase II", color: "text-amber-600" },
  1: { label: "Phase I", color: "text-muted-foreground" },
  0.5: { label: "Preclinical", color: "text-muted-foreground" },
};

function phaseInfo(phase: number | null): { label: string; color: string } {
  if (phase === null) return { label: "Unknown", color: "text-muted-foreground" };
  if (phase >= 4) return PHASE_LABELS[4];
  if (phase >= 3) return PHASE_LABELS[3];
  if (phase >= 2) return PHASE_LABELS[2];
  if (phase >= 1) return PHASE_LABELS[1];
  return PHASE_LABELS[0.5];
}

function formatAffinity(value: number | null, assayType: string | null): string {
  if (value === null) return "—";
  return `${value.toFixed(1)} ${assayType ? `(${assayType})` : ""}`.trim();
}

function formatAction(action: string | null): string {
  if (!action) return "Unknown";
  return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatTDL(tdl: string | null): string {
  if (!tdl) return "—";
  return tdl.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Data extraction
// ---------------------------------------------------------------------------

function extractDrugEdges(relations: unknown, edges?: unknown): DrugEdge[] {
  const source = relations ?? edges;
  if (!source || typeof source !== "object") return [];

  const results: DrugEdge[] = [];
  const record = source as Record<string, unknown>;

  // DRUG_ACTS_ON_GENE
  const actsOn = record.DRUG_ACTS_ON_GENE ?? record.drug_acts_on_gene;
  if (actsOn && typeof actsOn === "object") {
    const typed = actsOn as Record<string, unknown>;
    const rows = Array.isArray(typed.rows) ? typed.rows : Array.isArray(actsOn) ? actsOn : [];
    for (const row of rows as any[]) {
      const neighbor = row?.neighbor ?? row?.target ?? {};
      const link = row?.link ?? row?.edge ?? {};
      const props = link?.props ?? link ?? {};
      const id = neighbor?.id ?? row?.neighbor_id;
      if (!id) continue;

      results.push({
        id: `acts_on_${id}`,
        drugName: String(props.drug_name ?? neighbor?.label ?? neighbor?.name ?? "Unknown"),
        drugDescription: typeof (neighbor?.subtitle ?? props.drug_description) === "string"
          ? (neighbor?.subtitle ?? props.drug_description) : null,
        actionType: props.action_type ?? null,
        mechanismOfAction: props.mechanism_of_action ?? null,
        receptorFamily: props.receptor_family ?? null,
        targetName: props.target_name ?? null,
        bindingAffinity: typeof props.binding_affinity === "number" ? props.binding_affinity : null,
        bindingAssayType: props.binding_assay_type ?? null,
        maxClinicalPhase: typeof props.max_clinical_phase === "number" ? props.max_clinical_phase : null,
        isPrimaryTarget: typeof props.is_primary_target === "boolean" ? props.is_primary_target : null,
        targetDevelopmentLevel: props.target_development_level ?? null,
        diseaseNames: Array.isArray(props.disease_names) ? props.disease_names.filter(Boolean) : [],
        confidenceClass: props.confidence_class ?? null,
        evidenceCount: typeof props.evidence_count === "number" ? props.evidence_count : 0,
        sources: Array.isArray(props.sources) ? props.sources : [],
        numSources: typeof props.num_sources === "number" ? props.num_sources : 0,
        pubmedIds: Array.isArray(props.pubmed_ids) ? props.pubmed_ids : [],
        dispositionType: null,
        edgeType: "acts_on",
      });
    }
  }

  // DRUG_DISPOSITION_BY_GENE
  const disposition = record.DRUG_DISPOSITION_BY_GENE ?? record.drug_disposition_by_gene;
  if (disposition && typeof disposition === "object") {
    const typed = disposition as Record<string, unknown>;
    const rows = Array.isArray(typed.rows) ? typed.rows : Array.isArray(disposition) ? disposition : [];
    for (const row of rows as any[]) {
      const neighbor = row?.neighbor ?? row?.target ?? {};
      const link = row?.link ?? row?.edge ?? {};
      const props = link?.props ?? link ?? {};
      const id = neighbor?.id ?? row?.neighbor_id;
      if (!id) continue;

      results.push({
        id: `disposition_${id}`,
        drugName: String(props.drug_name ?? neighbor?.label ?? neighbor?.name ?? "Unknown"),
        drugDescription: typeof (neighbor?.subtitle ?? props.drug_description) === "string"
          ? (neighbor?.subtitle ?? props.drug_description) : null,
        actionType: null,
        mechanismOfAction: null,
        receptorFamily: null,
        targetName: null,
        bindingAffinity: null,
        bindingAssayType: null,
        maxClinicalPhase: null,
        isPrimaryTarget: null,
        targetDevelopmentLevel: props.target_development_level ?? null,
        diseaseNames: [],
        confidenceClass: props.confidence_class ?? null,
        evidenceCount: typeof props.evidence_count === "number" ? props.evidence_count : 0,
        sources: Array.isArray(props.sources) ? props.sources : [],
        numSources: typeof props.num_sources === "number" ? props.num_sources : 0,
        pubmedIds: Array.isArray(props.pubmed_ids) ? props.pubmed_ids : [],
        dispositionType: props.disposition_type ?? null,
        edgeType: "disposition",
      });
    }
  }

  return results.sort((a, b) => {
    // Primary target first, then by clinical phase, then binding affinity
    if (a.isPrimaryTarget && !b.isPrimaryTarget) return -1;
    if (!a.isPrimaryTarget && b.isPrimaryTarget) return 1;
    const phaseDiff = (b.maxClinicalPhase ?? -1) - (a.maxClinicalPhase ?? -1);
    if (phaseDiff !== 0) return phaseDiff;
    return (b.bindingAffinity ?? -1) - (a.bindingAffinity ?? -1);
  });
}

// ---------------------------------------------------------------------------
// Progressive rendering
// ---------------------------------------------------------------------------
const PAGE_SIZE = 100;

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DrugLandscapeOverview({
  relations,
  edges,
  geneSymbol,
  className,
}: DrugLandscapeOverviewProps) {
  const [typeFilter, setTypeFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [sortMode, setSortMode] = useState("phase-desc");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const drugs = useMemo(() => extractDrugEdges(relations, edges), [relations, edges]);

  const actionOptions = useMemo(() => {
    const actions = new Set<string>();
    drugs.forEach((d) => { if (d.actionType) actions.add(d.actionType); });
    return [{ value: "all", label: "All" }].concat(
      Array.from(actions).sort().map((a) => ({ value: a, label: formatAction(a) })),
    );
  }, [drugs]);

  const dimensions = useMemo<DimensionConfig[]>(
    () => [
      {
        label: "Relationship",
        value: typeFilter,
        onChange: setTypeFilter,
        options: [
          { value: "all", label: "All" },
          { value: "acts_on", label: "Drug target" },
          { value: "disposition", label: "Metabolism / Transport" },
        ],
      },
      ...(actionOptions.length > 2 ? [{
        label: "Action",
        value: actionFilter,
        onChange: setActionFilter,
        options: actionOptions,
      }] : []),
      {
        label: "Phase",
        value: phaseFilter,
        onChange: setPhaseFilter,
        options: [
          { value: "all", label: "Any" },
          { value: "4", label: "Approved" },
          { value: "3", label: "Phase III+" },
          { value: "2", label: "Phase II+" },
        ],
      },
      {
        label: "Sort",
        value: sortMode,
        onChange: setSortMode,
        options: [
          { value: "phase-desc", label: "Phase" },
          { value: "affinity-desc", label: "Affinity" },
          { value: "alpha", label: "A-Z" },
        ],
        presentation: "segmented" as const,
      },
    ],
    [typeFilter, actionFilter, actionOptions, phaseFilter, sortMode],
  );

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search, typeFilter, actionFilter, phaseFilter, sortMode]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const minPhase = phaseFilter === "all" ? null : parseFloat(phaseFilter);

    return drugs.filter((d) => {
      if (typeFilter !== "all" && d.edgeType !== typeFilter) return false;
      if (actionFilter !== "all" && d.actionType !== actionFilter) return false;
      if (minPhase !== null && (d.maxClinicalPhase ?? -1) < minPhase) return false;
      if (query.length > 0) {
        const matches =
          d.drugName.toLowerCase().includes(query) ||
          d.mechanismOfAction?.toLowerCase().includes(query) ||
          d.diseaseNames.some((name) => name.toLowerCase().includes(query));
        if (!matches) return false;
      }
      return true;
    });
  }, [drugs, search, typeFilter, actionFilter, phaseFilter]);

  const sorted = useMemo(() => {
    const items = [...filtered];
    if (sortMode === "alpha") return items.sort((a, b) => a.drugName.localeCompare(b.drugName));
    if (sortMode === "affinity-desc") {
      return items.sort((a, b) => {
        const diff = (b.bindingAffinity ?? -1) - (a.bindingAffinity ?? -1);
        return diff !== 0 ? diff : a.drugName.localeCompare(b.drugName);
      });
    }
    // phase-desc (default)
    return items.sort((a, b) => {
      if (a.isPrimaryTarget && !b.isPrimaryTarget) return -1;
      if (!a.isPrimaryTarget && b.isPrimaryTarget) return 1;
      const diff = (b.maxClinicalPhase ?? -1) - (a.maxClinicalPhase ?? -1);
      return diff !== 0 ? diff : a.drugName.localeCompare(b.drugName);
    });
  }, [filtered, sortMode]);

  const visible = useMemo(() => sorted.slice(0, visibleCount), [sorted, visibleCount]);
  const hasMore = sorted.length > visibleCount;

  // Group by edge type
  const grouped = useMemo(() => {
    const map = new Map<string, DrugEdge[]>();
    for (const d of visible) {
      const key = d.edgeType === "disposition" ? "Metabolism & Transport" : "Drug Targets";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    // Ensure "Drug Targets" comes first
    const entries = Array.from(map.entries());
    entries.sort((a) => a[0] === "Drug Targets" ? -1 : 1);
    return entries;
  }, [visible]);

  useEffect(() => {
    if (sorted.length === 0) { setSelectedId(null); return; }
    if (!selectedId || !sorted.some((d) => d.id === selectedId)) {
      setSelectedId(sorted[0].id);
    }
  }, [sorted, selectedId]);

  const selected = useMemo(
    () => sorted.find((d) => d.id === selectedId) ?? sorted[0] ?? null,
    [sorted, selectedId],
  );

  const showMore = useCallback(() => { setVisibleCount((prev) => prev + PAGE_SIZE); }, []);

  if (!drugs.length) {
    return (
      <NoDataState
        categoryName="Drug Landscape"
        description={`No drugs directly target ${geneSymbol ?? "this gene"}. Check Pharmacogenomics for drug-response associations driven by genetic variants.`}
      />
    );
  }

  const actsOnCount = drugs.filter((d) => d.edgeType === "acts_on").length;
  const dispositionCount = drugs.filter((d) => d.edgeType === "disposition").length;

  return (
    <TooltipProvider delayDuration={200}>
      <Card className={cn("border border-border py-0 gap-0", className)}>
        <CardHeader className="border-b border-border px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-semibold text-foreground">
                Drug Landscape
              </CardTitle>
              <div className="text-xs text-muted-foreground">
                {filtered.length === drugs.length
                  ? <>{actsOnCount} drug targets{dispositionCount > 0 && <>, {dispositionCount} metabolizers</>}</>
                  : <>{filtered.length} of {drugs.length} drugs</>
                } for {geneSymbol ?? "this gene"}
              </div>
            </div>
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground z-10" />
              <Input
                type="text"
                placeholder="Search drugs..."
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
            {/* ── Drug List ── */}
            <div className="border-b border-border lg:border-b-0 lg:border-r border-r-border">
              <div className="max-h-[600px] overflow-y-auto">
                {grouped.length === 0 && (
                  <div className="px-5 py-8 text-xs text-muted-foreground text-center">
                    No drugs match your filters.
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
                    {items.map((d) => {
                      const isSelected = d.id === selectedId;
                      const phase = phaseInfo(d.maxClinicalPhase);

                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setSelectedId(d.id)}
                          className={cn(
                            "w-full px-5 py-2.5 text-left transition-colors",
                            "border-b border-border/60",
                            "hover:bg-accent/50",
                            isSelected && "bg-accent/70",
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-[13px] font-medium text-foreground leading-snug line-clamp-1">
                                {d.drugName}
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {d.actionType && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                    <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", ACTION_COLORS[d.actionType] ?? "bg-muted-foreground/40")} />
                                    {formatAction(d.actionType)}
                                  </span>
                                )}
                                {d.dispositionType && (
                                  <span className="text-[10px] text-muted-foreground capitalize">
                                    {d.dispositionType.replace(/_/g, " ")}
                                  </span>
                                )}
                                {d.isPrimaryTarget && (
                                  <span className="text-[10px] text-primary font-medium">Primary</span>
                                )}
                              </div>
                            </div>
                            {d.maxClinicalPhase !== null && (
                              <span className={cn("text-[11px] font-medium tabular-nums shrink-0", phase.color)}>
                                {phase.label}
                              </span>
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
                    Select a drug to view details.
                  </div>
                )}

                {selected && (
                  <div className="space-y-5">
                    {/* ─ Title ─ */}
                    <div className="space-y-2">
                      <h3 className="text-[15px] font-semibold text-foreground leading-snug">
                        {selected.drugName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        {selected.actionType && (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className={cn("h-2 w-2 rounded-full shrink-0", ACTION_COLORS[selected.actionType] ?? "bg-muted-foreground/40")} />
                            {formatAction(selected.actionType)}
                          </span>
                        )}
                        {selected.dispositionType && (
                          <span className="text-xs text-muted-foreground capitalize">
                            {selected.dispositionType.replace(/_/g, " ")}
                          </span>
                        )}
                        {selected.isPrimaryTarget && (
                          <Tip content="This gene is a primary mechanism-of-action target for this drug — not an off-target or secondary effect.">
                            <span className="text-xs text-primary font-medium">Primary target</span>
                          </Tip>
                        )}
                        {selected.confidenceClass && (
                          <span className={cn(
                            "text-xs",
                            selected.confidenceClass === "high" ? "text-emerald-600" :
                            selected.confidenceClass === "medium" ? "text-amber-600" : "text-muted-foreground"
                          )}>
                            {selected.confidenceClass === "high" ? "High confidence" :
                             selected.confidenceClass === "medium" ? "Moderate" : "Preliminary"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ─ Key metrics ─ */}
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                      {selected.maxClinicalPhase !== null && (
                        <div>
                          <Tip content="Highest clinical trial phase reached for this drug-gene pair across all indications.">
                            <span className="text-[11px] text-muted-foreground">Clinical phase</span>
                          </Tip>
                          <div className={cn("text-sm font-semibold tabular-nums", phaseInfo(selected.maxClinicalPhase).color)}>
                            {phaseInfo(selected.maxClinicalPhase).label}
                          </div>
                        </div>
                      )}
                      {selected.bindingAffinity !== null && (
                        <div>
                          <Tip content="Binding affinity as -log10(M). Higher values mean tighter binding. Values above 7 are considered potent.">
                            <span className="text-[11px] text-muted-foreground">Binding affinity</span>
                          </Tip>
                          <div className="text-sm font-semibold text-foreground tabular-nums">
                            {formatAffinity(selected.bindingAffinity, selected.bindingAssayType)}
                            {selected.bindingAffinity >= 7 && (
                              <span className="ml-1 text-[10px] text-emerald-600 font-normal">potent</span>
                            )}
                          </div>
                        </div>
                      )}
                      {selected.evidenceCount > 0 && (
                        <div>
                          <Tip content="Number of independent evidence records supporting this drug-gene interaction.">
                            <span className="text-[11px] text-muted-foreground">Evidence</span>
                          </Tip>
                          <div className="text-sm font-semibold text-foreground tabular-nums">
                            {selected.evidenceCount}
                          </div>
                        </div>
                      )}
                      {selected.receptorFamily && (
                        <div>
                          <Tip content="Protein family classification of the target (e.g. Kinase, GPCR, Ion Channel).">
                            <span className="text-[11px] text-muted-foreground">Target class</span>
                          </Tip>
                          <div className="text-sm font-semibold text-foreground">
                            {selected.receptorFamily}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ─ Drug description ─ */}
                    {selected.drugDescription && (
                      <p className="text-[13px] text-muted-foreground leading-relaxed">
                        {selected.drugDescription}
                      </p>
                    )}

                    {/* ─ Mechanism ─ */}
                    {selected.mechanismOfAction && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                          Mechanism of action
                        </span>
                        <p className="text-[13px] text-foreground">
                          {selected.mechanismOfAction}
                        </p>
                      </div>
                    )}

                    {/* ─ Target info ─ */}
                    {(selected.targetName || selected.targetDevelopmentLevel) && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                          Target information
                        </span>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                          {selected.targetName && (
                            <div>
                              <span className="text-[11px] text-muted-foreground">Target name</span>
                              <div className="text-[13px] text-foreground">{selected.targetName}</div>
                            </div>
                          )}
                          {selected.targetDevelopmentLevel && (
                            <div>
                              <Tip content="Target Development Level: how well-studied this target is. Ranges from 'Tdark' (minimal info) to 'Tclin' (approved drug target).">
                                <span className="text-[11px] text-muted-foreground">Development level</span>
                              </Tip>
                              <div className="text-[13px] text-foreground">{formatTDL(selected.targetDevelopmentLevel)}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ─ Diseases ─ */}
                    {selected.diseaseNames.length > 0 && (
                      <div className="space-y-1.5">
                        <Tip content="Diseases for which this drug targets this gene.">
                          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                            Indications
                          </span>
                        </Tip>
                        <div className="flex flex-wrap gap-1">
                          {selected.diseaseNames.slice(0, 8).map((name) => (
                            <span
                              key={name}
                              className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                            >
                              {name}
                            </span>
                          ))}
                          {selected.diseaseNames.length > 8 && (
                            <span className="text-[11px] text-muted-foreground">
                              +{selected.diseaseNames.length - 8} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ─ Sources ─ */}
                    {selected.sources.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                          Data sources
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {selected.sources.map((src) => (
                            <span
                              key={src}
                              className="inline-flex items-center rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                            >
                              {src}
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
