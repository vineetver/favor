import { useState, type ReactNode } from "react";

import { MessageResponse } from "@shared/components/ai-elements/message";
import { Badge } from "@shared/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@shared/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/components/ui/table";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@infra/utils";
import { isArtifactRef, type ArtifactRef } from "../lib/compact-message";
import type {
  CompressedSearchResult,
  CompressedNeighbor,
  CompressedEnrichment,
  CompressedGwasAssociation,
  CompressedGeneStats,
  CompressedPath,
  CompressedCohort,
  CompressedPatternMatch,
  PathsResult,
  PatternsResult,
  AgentPlan,
  PlanStep,
  VariantTriageOutput,
  BioContextOutput,
  SubagentToolTrace,
  EvidenceRef,
} from "../types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function TypeBadge({ type }: { type: string }) {
  return (
    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
      {type}
    </Badge>
  );
}

function fmt(n: number, digits = 2): string {
  if (n === 0) return "0";
  if (Math.abs(n) < 0.01) return n.toExponential(digits);
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function StatCard({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1.5">
        {label}
      </p>
      {children}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground tabular-nums">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Text summary + collapsible raw data
// ---------------------------------------------------------------------------

function TextSummaryWithData({
  textSummary,
  children,
}: {
  textSummary: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <MessageResponse>{textSummary}</MessageResponse>
      <Collapsible>
        <CollapsibleTrigger className="group/raw flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDownIcon className="size-3 transition-transform duration-200 group-data-[state=open]/raw:rotate-180" />
          <span className="font-medium">View raw data</span>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          {children}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Search Results
// ---------------------------------------------------------------------------

function SearchResultsRenderer({
  results,
}: {
  results: CompressedSearchResult[];
}) {
  if (!results.length) return <p className="text-xs text-muted-foreground">No results found.</p>;
  return (
    <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-20">Type</TableHead>
          <TableHead>Name</TableHead>
          <TableHead className="w-40">ID</TableHead>
          <TableHead className="w-16 text-right">Score</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((r) => (
          <TableRow key={r.id}>
            <TableCell><TypeBadge type={r.type} /></TableCell>
            <TableCell className="font-medium">{r.label}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{r.id}</TableCell>
            <TableCell className="text-right tabular-nums">{fmt(r.score)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ranked Neighbors
// ---------------------------------------------------------------------------

interface NeighborsOutput {
  textSummary?: string;
  resolved?: { direction?: string; scoreField?: string };
  scoreField?: string;
  totalReturned?: number;
  neighbors: CompressedNeighbor[];
}

function NeighborsRenderer({ data }: { data: NeighborsOutput }) {
  const neighbors = data.neighbors;
  if (!neighbors?.length) return <p className="text-xs text-muted-foreground">No neighbors found.</p>;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Entity</TableHead>
            <TableHead className="w-20">Type</TableHead>
            {neighbors[0]?.score != null && (
              <TableHead className="w-16 text-right">Score</TableHead>
            )}
            {neighbors[0]?.explanation && (
              <TableHead>Explanation</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {neighbors.map((n) => (
            <TableRow key={n.entity.id}>
              <TableCell className="tabular-nums text-muted-foreground whitespace-nowrap">{n.rank}</TableCell>
              <TableCell className="font-medium">{n.entity.label}</TableCell>
              <TableCell><TypeBadge type={n.entity.type} /></TableCell>
              {n.score != null && (
                <TableCell className="text-right tabular-nums whitespace-nowrap">{fmt(n.score)}</TableCell>
              )}
              {n.explanation && (
                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                  {typeof n.explanation === "string" ? n.explanation : JSON.stringify(n.explanation)}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Enrichment
// ---------------------------------------------------------------------------

function EnrichmentRenderer({
  results,
}: {
  results: CompressedEnrichment[];
}) {
  if (!results.length) return <p className="text-xs text-muted-foreground">No enrichment results.</p>;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Term</TableHead>
            <TableHead className="w-20">Type</TableHead>
            <TableHead className="w-16 text-right">Overlap</TableHead>
            <TableHead className="w-20 text-right">P-value</TableHead>
            <TableHead className="w-20 text-right">Adj P</TableHead>
            <TableHead className="w-16 text-right">Fold</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((r) => (
            <TableRow key={r.entity.id}>
              <TableCell>
                <div>
                  <span className="font-medium">{r.entity.label}</span>
                  {r.overlappingGenes && r.overlappingGenes.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {r.overlappingGenes.slice(0, 6).map((g) => (
                        <span key={g} className="text-[10px] font-mono bg-primary/8 text-primary rounded px-1 py-0">
                          {g}
                        </span>
                      ))}
                      {r.overlappingGenes.length > 6 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{r.overlappingGenes.length - 6}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell><TypeBadge type={r.entity.type} /></TableCell>
              <TableCell className="text-right tabular-nums">{r.overlap}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(r.pValue)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(r.adjustedPValue)}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(r.foldEnrichment)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GWAS
// ---------------------------------------------------------------------------

function GwasRenderer({
  data,
}: {
  data: {
    totalHits?: number;
    uniqueTraits?: number;
    topAssociations: CompressedGwasAssociation[];
  };
}) {
  const associations = data.topAssociations;
  const meta = data;

  if (!associations?.length) return <p className="text-xs text-muted-foreground">No GWAS associations found.</p>;

  return (
    <div className="space-y-2">
      {meta && (
        <div className="flex gap-3 text-xs text-muted-foreground">
          {meta.totalHits != null && <span>{meta.totalHits} total hits</span>}
          {meta.uniqueTraits != null && <span>{meta.uniqueTraits} unique traits</span>}
        </div>
      )}
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Trait</TableHead>
            <TableHead className="w-24 text-right">-log10(P)</TableHead>
            {associations[0]?.effectSize && (
              <TableHead className="w-24 text-right">Effect Size</TableHead>
            )}
            {associations[0]?.studyAccession && (
              <TableHead className="w-28">Study</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {associations.map((a, i) => (
            <TableRow key={`${a.trait}-${i}`}>
              <TableCell className="font-medium">{a.trait}</TableCell>
              <TableCell className="text-right tabular-nums whitespace-nowrap">{fmt(a.pValueMlog)}</TableCell>
              {a.effectSize && (
                <TableCell className="text-right tabular-nums whitespace-nowrap">{a.effectSize}</TableCell>
              )}
              {a.studyAccession && (
                <TableCell className="font-mono text-xs text-muted-foreground">{a.studyAccession}</TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Gene Variant Stats
// ---------------------------------------------------------------------------

function GeneStatsRenderer({ data }: { data: CompressedGeneStats }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-sm text-foreground">{data.gene}</span>
        <Badge variant="secondary" className="text-[10px]">{data.totalVariants.toLocaleString()} variants</Badge>
        <span className="text-xs text-muted-foreground">
          {data.snvCount.toLocaleString()} SNV &middot; {data.indelCount.toLocaleString()} InDel
        </span>
        {data.actionable > 0 && (
          <Badge className="text-[10px] bg-primary/10 text-primary border-0">{data.actionable} actionable</Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="ClinVar">
          <StatRow label="Pathogenic" value={data.clinvar.pathogenic} />
          <StatRow label="Likely pathogenic" value={data.clinvar.likelyPathogenic} />
          <StatRow label="VUS" value={data.clinvar.vus} />
          <StatRow label="Likely benign" value={data.clinvar.likelyBenign} />
          <StatRow label="Benign" value={data.clinvar.benign} />
          {data.clinvar.conflicting > 0 && <StatRow label="Conflicting" value={data.clinvar.conflicting} />}
        </StatCard>
        <StatCard label="Consequence">
          <StatRow label="LoF (total)" value={data.consequence.lof} />
          <StatRow label="Missense" value={data.consequence.missense} />
          <StatRow label="Nonsense" value={data.consequence.nonsense} />
          <StatRow label="Frameshift" value={data.consequence.frameshift} />
          <StatRow label="Splice" value={data.consequence.splice} />
          <StatRow label="Synonymous" value={data.consequence.synonymous} />
        </StatCard>
        <StatCard label="Location">
          <StatRow label="Exonic" value={data.location.exonic} />
          <StatRow label="Intronic" value={data.location.intronic} />
          <StatRow label="UTR" value={data.location.utr} />
          <StatRow label="Splicing" value={data.location.splicing} />
          <StatRow label="Regulatory" value={data.location.regulatory} />
        </StatCard>
        <StatCard label="Frequency">
          <StatRow label="Common" value={data.frequency.common} />
          <StatRow label="Low freq" value={data.frequency.lowFreq} />
          <StatRow label="Rare" value={data.frequency.rare} />
          <StatRow label="Ultra-rare" value={data.frequency.ultraRare} />
          <StatRow label="Singleton" value={data.frequency.singleton} />
        </StatCard>
        <StatCard label="Pathogenicity Predictions">
          <StatRow label="High CADD (≥20)" value={data.scores.highCadd} />
          <StatRow label="REVEL pathogenic" value={data.scores.highRevel} />
          <StatRow label="AlphaMissense path." value={data.scores.highAlphaMissense} />
          <StatRow label="SpliceAI affecting" value={data.scores.splicingAffecting} />
          <StatRow label="SIFT deleterious" value={data.scores.siftDeleterious} />
          <StatRow label="PolyPhen damaging" value={data.scores.polyphenDamaging} />
        </StatCard>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function PathsRenderer({ paths }: { paths: CompressedPath[] }) {
  if (!paths.length) return <p className="text-xs text-muted-foreground">No paths found.</p>;
  return (
    <div className="space-y-2">
      {paths.map((p) => (
        <div key={p.rank} className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
          <span className="shrink-0 text-xs font-medium text-muted-foreground mt-0.5">#{p.rank}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1 text-xs">
              {p.nodes.map((n, i) => (
                <span key={n.id} className="inline-flex items-center gap-1">
                  {i > 0 && <span className="text-muted-foreground mx-0.5">&rarr;</span>}
                  <TypeBadge type={n.type} />
                  <span className="font-medium text-foreground">{n.label}</span>
                </span>
              ))}
            </div>
          </div>
          <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">{p.length} hops</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

function PatternsRenderer({ data }: { data: PatternsResult }) {
  if (!data.matches.length) return <p className="text-xs text-muted-foreground">No pattern matches found.</p>;
  return (
    <div className="space-y-2">
      {data.textSummary && (
        <p className="text-xs text-muted-foreground">{data.textSummary}</p>
      )}
      {data.matches.slice(0, 10).map((m, idx) => (
        <div key={idx} className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
          <span className="shrink-0 text-xs font-medium text-muted-foreground mt-0.5">#{idx + 1}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1 text-xs">
              {Object.entries(m.vars).map(([varName, entity], i) => (
                <span key={varName} className="inline-flex items-center gap-1">
                  {i > 0 && <span className="text-muted-foreground mx-0.5">&mdash;</span>}
                  <TypeBadge type={entity.type} />
                  <span className="font-medium text-foreground">{entity.label}</span>
                  <span className="text-muted-foreground text-[10px]">({varName})</span>
                </span>
              ))}
            </div>
          </div>
          {m.score != null && (
            <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">{m.score.toFixed(2)}</span>
          )}
        </div>
      ))}
      {data.counts.returned > 10 && (
        <p className="text-[10px] text-muted-foreground">Showing 10 of {data.counts.returned} matches</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cohort
// ---------------------------------------------------------------------------

function CohortRenderer({ data }: { data: CompressedCohort }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm text-foreground">Cohort created</span>
        <Badge variant="secondary" className="text-[10px] font-mono">{data.cohortId}</Badge>
      </div>
      <div className="flex gap-3 text-xs text-muted-foreground">
        <span>{data.variantCount.toLocaleString()} variants</span>
        <span>{data.resolution.resolved}/{data.resolution.total} resolved</span>
        {data.resolution.notFound > 0 && (
          <span className="text-amber-600">{data.resolution.notFound} not found</span>
        )}
      </div>
      {data.summary && <p className="text-xs text-muted-foreground">{data.summary}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plan Renderer (task list checklist)
// ---------------------------------------------------------------------------

export interface ToolUIPart {
  type: string;
  toolCallId?: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
}

type PlanItemStatus = "completed" | "in-progress" | "pending" | "errored";

/** Normalize tool names so LLM-generated names match actual part names.
 *  "find_paths" / "findPaths" / "Find Paths" all → "findpaths" */
function normToolName(name: string): string {
  return name.toLowerCase().replace(/[_\-\s]/g, "");
}

/** Check if a normalized plan tool name matches a normalized actual tool name. */
function toolNameMatches(planTool: string, actualTool: string): boolean {
  const a = normToolName(planTool);
  const b = normToolName(actualTool);
  return a === b || b.includes(a) || a.includes(b);
}

const RUNNING_STATES = new Set(["input-available", "input-streaming"]);

// ---------------------------------------------------------------------------
// Plan format helpers
// ---------------------------------------------------------------------------

/** Map PlanStep to the tool name it corresponds to */
function planStepToToolName(step: PlanStep): string | null {
  if (step.do === "resolve") return "searchEntities";
  if (step.do === "delegate") return step.agent;
  return null;
}

/** Get display label for a plan step */
function getPlanStepLabel(step: PlanStep): string {
  if (step.do === "resolve") {
    return `Resolve entities: ${step.entities.join(", ")}`;
  }
  if (step.do === "delegate") {
    const agentLabel = step.agent === "variantTriage" ? "Cohort Analysis" : "Knowledge Graph";
    return `${agentLabel}: ${step.task}`;
  }
  if (step.do === "synthesize") return "Synthesize findings";
  if (step.do === "direct") return step.description || "Processing";
  if (step.do === "batch") return step.description || "Batch processing";
  return "Processing";
}

/** Compute statuses for plan steps */
function computePlanStatuses(
  steps: PlanStep[],
  siblingToolParts: ToolUIPart[],
  isStreaming: boolean,
): PlanItemStatus[] {
  // Collect tool part names claimed by resolve/delegate steps
  const claimedNames = new Set<string>();
  for (const step of steps) {
    const toolName = planStepToToolName(step);
    if (toolName) claimedNames.add(normToolName(toolName));
  }

  // Unclaimed tool parts = tools triggered by direct/batch steps
  const unclaimedParts = siblingToolParts.filter((p) => {
    const name = normToolName(p.toolName ?? (p.type ?? "").replace(/^tool-/, ""));
    // Not claimed by any resolve/delegate step
    return ![...claimedNames].some((cn) => toolNameMatches(cn, name));
  });

  const getToolPartStatus = (toolName: string): PlanItemStatus => {
    const matching = siblingToolParts.filter((p) => {
      const name = (p.toolName ?? (p.type ?? "").replace(/^tool-/, ""));
      return toolNameMatches(toolName, name);
    });
    if (matching.length === 0) return "pending";
    const hasSuccess = matching.some((p) => p.state === "output-available");
    const hasError = matching.some((p) => p.state === "output-error");
    const hasRunning = matching.some((p) => RUNNING_STATES.has(p.state ?? ""));
    if (hasSuccess) return "completed";
    if (hasRunning) return "in-progress";
    if (hasError && !hasSuccess) return "errored";
    return "pending";
  };

  /** Status for direct/batch steps: derived from unclaimed tool parts */
  const getUnclaimedStatus = (): PlanItemStatus => {
    if (unclaimedParts.length === 0) {
      // No unclaimed tools yet — in-progress if streaming (tools may still come), pending otherwise
      return isStreaming ? "in-progress" : "pending";
    }
    const hasSuccess = unclaimedParts.some((p) => p.state === "output-available");
    const hasError = unclaimedParts.some((p) => p.state === "output-error");
    const hasRunning = unclaimedParts.some((p) => RUNNING_STATES.has(p.state ?? ""));
    if (hasRunning) return "in-progress";
    if (hasSuccess) return "completed";
    if (hasError) return "errored";
    return "in-progress"; // parts exist but in unknown state — treat as running
  };

  const toolStepStatuses = steps.map((step) => {
    if (step.do === "direct" || step.do === "batch") return getUnclaimedStatus();
    const toolName = planStepToToolName(step);
    if (!toolName) return "pending" as PlanItemStatus; // synthesize step
    return getToolPartStatus(toolName);
  });

  return steps.map((step, i) => {
    if (step.do === "synthesize") {
      const allOthersDone = steps.every((s, j) => {
        if (s.do === "synthesize") return true;
        return toolStepStatuses[j] === "completed" || toolStepStatuses[j] === "errored";
      });
      if (allOthersDone && !isStreaming) return "completed";
      if (allOthersDone && isStreaming) return "in-progress";
      return "pending";
    }
    return toolStepStatuses[i];
  });
}

// ---------------------------------------------------------------------------
// Status icon component
// ---------------------------------------------------------------------------

function StatusIcon({ status }: { status: PlanItemStatus }) {
  if (status === "completed") {
    return (
      <svg className="size-4 shrink-0 text-emerald-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
      </svg>
    );
  }
  if (status === "in-progress") {
    return (
      <svg className="size-4 shrink-0 text-primary animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
    );
  }
  if (status === "errored") {
    return (
      <svg className="size-4 shrink-0 text-amber-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  }
  return (
    <svg className="size-4 shrink-0 text-muted-foreground/40" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function statusTextClass(status: PlanItemStatus): string {
  if (status === "completed") return "text-muted-foreground";
  if (status === "errored") return "text-amber-600";
  if (status === "in-progress") return "text-foreground font-medium";
  return "text-muted-foreground";
}

// ---------------------------------------------------------------------------
// Subagent Tool Trace Timeline
// ---------------------------------------------------------------------------

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  analyzeCohort: "Analyze Cohort",
  runAnalytics: "Run Analytics",
  createCohort: "Create Cohort",
  getCohortSchema: "Cohort Schema",
  lookupVariant: "Lookup Variant",
  getGeneVariantStats: "Gene Stats",
  getGwasAssociations: "GWAS Lookup",
  variantBatchSummary: "Batch Summary",
  searchEntities: "Search",
  getEntityContext: "Entity Context",
  getRankedNeighbors: "Ranked Neighbors",
  findPaths: "Find Paths",
  findPatterns: "Find Patterns",
  getSharedNeighbors: "Shared Neighbors",
  getConnections: "Connections",
  getEdgeDetail: "Edge Detail",
  graphTraverse: "Graph Traverse",
  compareEntities: "Compare",
  runEnrichment: "Enrichment",
  getGraphSchema: "Graph Schema",
  State: "State",
  Read: "Read",
  Search: "Search",
  Run: "Run",
  AskUser: "Ask User",
};

function TraceStatusDot({ status }: { status: "completed" | "error" }) {
  if (status === "completed") {
    return (
      <svg className="size-3 shrink-0 text-emerald-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" />
      </svg>
    );
  }
  return (
    <svg className="size-3 shrink-0 text-destructive" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Trace item detail views
// ---------------------------------------------------------------------------

/** Render tool input as clean key-value pairs or formatted JSON */
function TraceInputDisplay({ input }: { input: Record<string, unknown> }) {
  const entries = Object.entries(input);
  if (entries.length === 0) return null;

  const isSimple = entries.every(
    ([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean",
  );

  if (isSimple && entries.length <= 6) {
    return (
      <div className="space-y-0.5">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-baseline gap-2 text-[11px]">
            <span className="font-mono text-muted-foreground/70 shrink-0 min-w-[100px]">{key}</span>
            <span className="text-foreground font-mono break-all">{String(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <pre className="text-[11px] text-foreground/90 font-mono whitespace-pre-wrap break-all overflow-auto max-h-48 leading-relaxed">
      {JSON.stringify(input, null, 2)}
    </pre>
  );
}

/** Truncated JSON display with expandable "show more" */
function TruncatedJson({ data }: { data: unknown }) {
  const [expanded, setExpanded] = useState(false);
  const json = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const isLong = json.length > 2000;

  return (
    <div>
      <pre className="text-[11px] text-foreground/90 font-mono whitespace-pre-wrap break-all overflow-auto max-h-64 leading-relaxed">
        {isLong && !expanded ? json.slice(0, 2000) + "\n..." : json}
      </pre>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-[10px] font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

/** Render tool output: errors get red treatment, success uses specialized renderers */
function TraceOutputDisplay({
  toolName,
  output,
  status,
}: {
  toolName: string;
  output: unknown;
  status: "completed" | "error";
}) {
  if (status === "error" && output && typeof output === "object") {
    const err = output as Record<string, unknown>;
    const errorObj = err.error as Record<string, unknown> | undefined;
    const code = String(errorObj?.code ?? err.code ?? "");
    const message = String(errorObj?.message ?? err.message ?? "Unknown error");

    return (
      <div className="rounded-md bg-destructive/5 border border-destructive/15 px-3 py-2 space-y-1">
        {code && (
          <span className="inline-block font-mono text-[10px] font-semibold text-destructive/80 bg-destructive/10 rounded px-1.5 py-0.5">
            {String(code)}
          </span>
        )}
        <p className="text-[11px] text-destructive/90 leading-relaxed break-words">
          {String(message).slice(0, 500)}
        </p>
      </div>
    );
  }

  if (!output || typeof output !== "object") {
    return output != null ? (
      <span className="text-[11px] text-muted-foreground font-mono">{String(output)}</span>
    ) : null;
  }

  // Try specialized renderer for known tool outputs
  const rendered = renderToolOutput(toolName, output);
  if (rendered) {
    return <div className="max-h-64 overflow-auto">{rendered}</div>;
  }

  // Fallback: formatted JSON
  const json = JSON.stringify(output, null, 2);
  return (
    <pre className="text-[11px] text-foreground/90 font-mono whitespace-pre-wrap break-all overflow-auto max-h-48 leading-relaxed">
      {json.length > 2000 ? json.slice(0, 2000) + "\n..." : json}
    </pre>
  );
}

// ---------------------------------------------------------------------------
// Expandable Trace Timeline
// ---------------------------------------------------------------------------

function SubagentTraceTimeline({ traces }: { traces: SubagentToolTrace[] }) {
  const errorCount = traces.filter((t) => t.status === "error").length;
  const successCount = traces.length - errorCount;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/60">
        <svg className="size-3.5 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="6" height="16" x="4" y="2" rx="2" /><rect width="6" height="9" x="14" y="9" rx="2" /><path d="M22 22H2" />
        </svg>
        <span className="text-[11px] font-semibold text-foreground">
          Tool Calls
        </span>
        <span className="text-[10px] text-muted-foreground">
          {traces.length} total
        </span>
        {successCount > 0 && (
          <span className="text-[10px] text-emerald-600">{successCount} passed</span>
        )}
        {errorCount > 0 && (
          <span className="text-[10px] text-destructive">{errorCount} failed</span>
        )}
      </div>

      {/* Trace items */}
      <div className="divide-y divide-border/40">
        {traces.map((t, i) => {
          const hasDetail = t.input || t.output;
          const displayName = TOOL_DISPLAY_NAMES[t.toolName] ?? t.toolName;

          if (!hasDetail) {
            // Non-expandable compact row (no detail data available)
            return (
              <div
                key={`${t.toolName}-${i}`}
                className="flex items-center gap-2 px-3 py-1.5 text-[11px] min-w-0"
              >
                <TraceStatusDot status={t.status} />
                <span className="font-medium text-foreground shrink-0">{displayName}</span>
                <span className="text-muted-foreground truncate" title={t.inputSummary}>
                  {t.inputSummary}
                </span>
                {t.outputSummary && (
                  <>
                    <span className="text-muted-foreground/40 shrink-0">&rarr;</span>
                    <span
                      className={cn(
                        "truncate",
                        t.status === "error" ? "text-destructive/80" : "text-muted-foreground",
                      )}
                      title={t.outputSummary}
                    >
                      {t.outputSummary.slice(0, 80)}
                    </span>
                  </>
                )}
              </div>
            );
          }

          return (
            <TraceExpandableItem key={`${t.toolName}-${i}`} trace={t} displayName={displayName} />
          );
        })}
      </div>
    </div>
  );
}

/** A single expandable trace item — errors auto-expand */
function TraceExpandableItem({
  trace,
  displayName,
}: {
  trace: SubagentToolTrace;
  displayName: string;
}) {
  const [open, setOpen] = useState(trace.status === "error");

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="group/trace flex w-full items-center gap-2 px-3 py-1.5 text-[11px] min-w-0 transition-colors hover:bg-accent/30">
        <TraceStatusDot status={trace.status} />
        <span className="font-medium text-foreground shrink-0">{displayName}</span>
        <span className="text-muted-foreground truncate" title={trace.inputSummary}>
          {trace.inputSummary}
        </span>
        {trace.outputSummary && (
          <>
            <span className="text-muted-foreground/40 shrink-0">&rarr;</span>
            <span
              className={cn(
                "truncate flex-1 text-left",
                trace.status === "error" ? "text-destructive/80" : "text-muted-foreground",
              )}
              title={trace.outputSummary}
            >
              {trace.outputSummary.slice(0, 80)}
            </span>
          </>
        )}
        <svg
          className="size-3 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-data-[state=open]/trace:rotate-180"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="px-3 pb-2.5 pt-1 ml-5 space-y-2.5">
          {/* Input section */}
          {trace.input && Object.keys(trace.input).length > 0 && (
            <div className="space-y-1">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Input
              </span>
              <div className="rounded-md bg-muted/40 border border-border/50 px-2.5 py-2">
                <TraceInputDisplay input={trace.input} />
              </div>
            </div>
          )}

          {/* Output section */}
          {trace.output != null && (
            <div className="space-y-1">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Output
              </span>
              <div className={cn(
                "rounded-md border px-2.5 py-2",
                trace.status === "error"
                  ? "bg-destructive/[0.02] border-destructive/10"
                  : "bg-muted/40 border-border/50",
              )}>
                <TraceOutputDisplay
                  toolName={trace.toolName}
                  output={trace.output}
                  status={trace.status}
                />
              </div>
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// Subagent Renderer
// ---------------------------------------------------------------------------

const AGENT_TYPE_LABELS: Record<string, string> = {
  variantTriage: "Cohort Analysis",
  bioContext: "Knowledge Graph",
};

/** Compact count of evidence refs grouped by source */
function EvidenceRefsSummary({ refs }: { refs: EvidenceRef[] }) {
  const grouped = refs.reduce<Record<string, number>>((acc, r) => {
    acc[r.source] = (acc[r.source] ?? 0) + 1;
    return acc;
  }, {});
  const entries = Object.entries(grouped);

  return (
    <Collapsible>
      <CollapsibleTrigger className="group/ev flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
        <svg className="size-3 text-muted-foreground/50" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" />
        </svg>
        <span className="font-medium">{refs.length} data source{refs.length !== 1 ? "s" : ""}</span>
        <svg
          className="size-2.5 text-muted-foreground/40 transition-transform duration-200 group-data-[state=open]/ev:rotate-180"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {entries.map(([source, count]) => (
            <span
              key={source}
              className="inline-flex items-center gap-1 rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
            >
              {TOOL_DISPLAY_NAMES[source] ?? source}
              {count > 1 && <span className="text-muted-foreground/60">&times;{count}</span>}
            </span>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---------------------------------------------------------------------------
// Activity Timeline — flat, compact status lines (replaces PlanRenderer,
// SubagentCard, and SubagentRenderer)
// ---------------------------------------------------------------------------

const SUBAGENT_TOOL_NAMES = new Set(["bioContext", "variantTriage"]);

function PlanStepLine({
  step,
  status,
  subagentPart,
}: {
  step: PlanStep;
  status: PlanItemStatus;
  subagentPart?: ToolUIPart;
}) {
  const label = getPlanStepLabel(step);

  // Completed/errored delegate steps with output → expandable
  if (
    step.do === "delegate" &&
    (status === "completed" || status === "errored") &&
    subagentPart?.output
  ) {
    const output = subagentPart.output as VariantTriageOutput | BioContextOutput;
    const traces = output.toolTrace;
    const evidenceRefs = output.evidenceRefs;
    const agentLabel = AGENT_TYPE_LABELS[step.agent] ?? step.agent;

    return (
      <Collapsible>
        <CollapsibleTrigger className="group/del flex w-full items-center gap-2 py-0.5 text-sm rounded-md hover:bg-accent/30 px-1 -mx-1">
          <StatusIcon status={status} />
          <span className={cn(statusTextClass(status), "text-left")}>
            {agentLabel}
          </span>
          <span className="text-[10px] text-muted-foreground tabular-nums ml-auto">
            {output.stepsUsed} step{output.stepsUsed !== 1 ? "s" : ""} &middot;{" "}
            {output.toolCallsMade} tool{output.toolCallsMade !== 1 ? "s" : ""}
          </span>
          <ChevronDownIcon className="size-3 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-data-[state=open]/del:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-6 mt-1.5 mb-1 space-y-2">
            {traces && traces.length > 0 && (
              <SubagentTraceTimeline traces={traces} />
            )}
            {evidenceRefs && evidenceRefs.length > 0 && (
              <EvidenceRefsSummary refs={evidenceRefs} />
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Simple line for everything else
  return (
    <div className="flex items-center gap-2 py-0.5 text-sm">
      <StatusIcon status={status} />
      <span className={statusTextClass(status)}>{label}</span>
    </div>
  );
}

/** Compact line for artifact-ref outputs (compacted messages on reload) */
function ArtifactRefLine({
  part,
  ref,
}: {
  part: ToolUIPart;
  ref: ArtifactRef;
}) {
  const toolName = (part.toolName ?? part.type ?? "").replace(/^tool-/, "");
  const inputSummary = getToolInputSummary(toolName, part.input);
  const summary = ref.text_summary;

  return (
    <div className="flex items-center gap-2 py-0.5 text-sm">
      <StatusIcon status="completed" />
      <span className="text-muted-foreground flex-1 min-w-0 truncate">
        {inputSummary ?? (TOOL_DISPLAY_NAMES[toolName] ?? toolName)}
      </span>
      {summary && (
        <span className="text-[11px] text-muted-foreground truncate max-w-[50%]">
          {summary.length > 80 ? summary.slice(0, 77) + "..." : summary}
        </span>
      )}
    </div>
  );
}

function DirectToolLine({ part }: { part: ToolUIPart }) {
  const toolName = (part.toolName ?? part.type ?? "").replace(/^tool-/, "");
  const inputSummary = getToolInputSummary(toolName, part.input);
  const displayName = TOOL_DISPLAY_NAMES[toolName] ?? toolName;

  const isComplete = part.state === "output-available";
  const isError = part.state === "output-error";
  const isRunning =
    part.state === "input-available" || part.state === "input-streaming";
  const status: PlanItemStatus = isComplete
    ? "completed"
    : isError
      ? "errored"
      : isRunning
        ? "in-progress"
        : "pending";

  const hasOutput = isComplete || isError;

  // Handle artifact refs (compacted outputs from session reload)
  if (hasOutput && part.output && isArtifactRef(part.output)) {
    return <ArtifactRefLine part={part} ref={part.output} />;
  }

  // Extract brief output summary for inline display
  const outputBrief = (() => {
    if (!hasOutput || !part.output || typeof part.output !== "object") return null;
    const out = part.output as Record<string, unknown>;
    if (out.error === true) {
      const msg = (out.message as string) ?? "Error";
      return msg.length > 60 ? msg.slice(0, 57) + "..." : msg;
    }
    if (typeof out.text_summary === "string") {
      const ts = out.text_summary as string;
      return ts.length > 80 ? ts.slice(0, 77) + "..." : ts;
    }
    return null;
  })();

  // Subagent tools with output → expandable with trace
  if (SUBAGENT_TOOL_NAMES.has(toolName) && hasOutput && part.output) {
    const output = part.output as VariantTriageOutput | BioContextOutput;
    const traces = output.toolTrace;
    const evidenceRefs = output.evidenceRefs;
    const agentLabel = AGENT_TYPE_LABELS[toolName] ?? toolName;

    return (
      <Collapsible>
        <CollapsibleTrigger className="group/dt flex w-full items-center gap-2 py-0.5 text-sm rounded-md hover:bg-accent/30 px-1 -mx-1">
          <StatusIcon status={status} />
          <span className={cn(statusTextClass(status), "text-left")}>
            {agentLabel}
          </span>
          <span className="text-[10px] text-muted-foreground tabular-nums ml-auto">
            {output.stepsUsed} step{output.stepsUsed !== 1 ? "s" : ""} &middot;{" "}
            {output.toolCallsMade} tool{output.toolCallsMade !== 1 ? "s" : ""}
          </span>
          <ChevronDownIcon className="size-3 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-data-[state=open]/dt:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-6 mt-1.5 mb-1 space-y-2">
            {traces && traces.length > 0 && (
              <SubagentTraceTimeline traces={traces} />
            )}
            {evidenceRefs && evidenceRefs.length > 0 && (
              <EvidenceRefsSummary refs={evidenceRefs} />
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Regular tools with rendered output → expandable
  if (hasOutput && part.output) {
    const rendered = renderToolOutput(toolName, part.output);
    if (rendered) {
      return (
        <Collapsible>
          <CollapsibleTrigger className="group/dt flex w-full items-center gap-2 py-0.5 text-sm rounded-md hover:bg-accent/30 px-1 -mx-1">
            <StatusIcon status={status} />
            <span className={cn(statusTextClass(status), "flex-1 text-left")}>
              {inputSummary ?? displayName}
            </span>
            <ChevronDownIcon className="size-3 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-data-[state=open]/dt:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="ml-6 mt-1.5 mb-1">{rendered}</div>
          </CollapsibleContent>
        </Collapsible>
      );
    }

    // Generic fallback: show raw input/output JSON for any tool with output
    return (
      <Collapsible>
        <CollapsibleTrigger className="group/dt flex w-full items-center gap-2 py-0.5 text-sm rounded-md hover:bg-accent/30 px-1 -mx-1">
          <StatusIcon status={status} />
          <span className={cn(statusTextClass(status), "flex-1 text-left min-w-0")}>
            {inputSummary ?? displayName}
          </span>
          {outputBrief && (
            <span className={cn(
              "text-[11px] truncate max-w-[40%]",
              isError ? "text-destructive/70" : "text-muted-foreground",
            )}>
              {outputBrief}
            </span>
          )}
          <ChevronDownIcon className="size-3 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-data-[state=open]/dt:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-6 mt-1.5 mb-1 space-y-2.5">
            {part.input != null && typeof part.input === "object" && Object.keys(part.input as object).length > 0 && (
              <div className="space-y-1">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Input
                </span>
                <div className="rounded-md bg-muted/40 border border-border/50 px-2.5 py-2">
                  <TraceInputDisplay input={part.input as Record<string, unknown>} />
                </div>
              </div>
            )}
            <div className="space-y-1">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Output
              </span>
              <div className={cn(
                "rounded-md border px-2.5 py-2",
                isError
                  ? "bg-destructive/[0.02] border-destructive/10"
                  : "bg-muted/40 border-border/50",
              )}>
                <TruncatedJson data={part.output} />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Simple line (no output yet)
  return (
    <div className="flex items-center gap-2 py-0.5 text-sm">
      <StatusIcon status={status} />
      <span className={statusTextClass(status)}>
        {inputSummary ?? displayName}
      </span>
    </div>
  );
}

export function ActivityTimeline({
  plan,
  siblingToolParts,
  isStreaming,
  isPlanStreaming,
}: {
  plan: AgentPlan | null;
  siblingToolParts: ToolUIPart[];
  isStreaming: boolean;
  isPlanStreaming: boolean;
}) {
  // Planning in progress — single spinner line
  if (isPlanStreaming) {
    return (
      <div className="space-y-0.5 py-1">
        <div className="flex items-center gap-2 py-0.5 text-sm">
          <StatusIcon status="in-progress" />
          <span className="text-foreground font-medium">Planning...</span>
        </div>
      </div>
    );
  }

  // Plan-driven mode
  if (plan) {
    const statuses = computePlanStatuses(plan.steps, siblingToolParts, isStreaming);

    // Collect tool names claimed by resolve/delegate steps
    const claimedNames = new Set<string>();
    for (const step of plan.steps) {
      const tn = planStepToToolName(step);
      if (tn) claimedNames.add(normToolName(tn));
    }
    // Unclaimed = direct tool calls triggered by direct/batch steps
    const unclaimedParts = siblingToolParts.filter((p) => {
      const name = normToolName(p.toolName ?? (p.type ?? "").replace(/^tool-/, ""));
      return ![...claimedNames].some((cn) => toolNameMatches(cn, name));
    });

    return (
      <div className="space-y-0.5 py-1">
        {plan.steps.map((step, idx) => (
          <div key={`${step.do}-${idx}`}>
            <PlanStepLine
              step={step}
              status={statuses[idx]}
              subagentPart={
                step.do === "delegate"
                  ? siblingToolParts.find((p) => {
                      const name = (p.toolName ?? p.type ?? "").replace(
                        /^tool-/,
                        "",
                      );
                      return toolNameMatches(step.agent, name);
                    })
                  : undefined
              }
            />
            {/* Show actual tool calls under direct/batch steps */}
            {(step.do === "direct" || step.do === "batch") && unclaimedParts.length > 0 && (
              <div className="ml-6 space-y-0.5">
                {unclaimedParts.map((part, pidx) => (
                  <DirectToolLine key={part.toolCallId ?? `unclaimed-${pidx}`} part={part} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  // No-plan fallback
  if (siblingToolParts.length === 0) return null;

  const completedParts = siblingToolParts.filter(
    (p) => p.state === "output-available" || p.state === "output-error",
  );
  const toolSequence = completedParts.map((p) => {
    const name = (p.toolName ?? p.type ?? "").replace(/^tool-/, "");
    return TOOL_DISPLAY_NAMES[name] ?? name;
  });

  return (
    <div className="space-y-0.5 py-1">
      {siblingToolParts.map((part, idx) => (
        <DirectToolLine key={part.toolCallId ?? `tool-${idx}`} part={part} />
      ))}
      {completedParts.length >= 2 && !isStreaming && (
        <div className="pt-1 text-[10px] text-muted-foreground/60">
          {completedParts.length} steps &middot; {toolSequence.join(" → ")}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dispatcher
// ---------------------------------------------------------------------------

export function renderToolOutput(
  toolName: string,
  output: unknown,
): ReactNode | null {
  if (!output || typeof output !== "object") return null;

  // Artifact refs have no inline data to render
  if (isArtifactRef(output)) return null;

  // Check for error responses
  if ("error" in (output as Record<string, unknown>) && (output as Record<string, unknown>).error === true) {
    return null; // Let default error handling take over
  }

  const name = toolName.replace(/^tool-/, "");

  switch (name) {
    case "searchEntities": {
      if (Array.isArray(output)) {
        return <SearchResultsRenderer results={output as CompressedSearchResult[]} />;
      }
      return null;
    }
    case "getRankedNeighbors": {
      const d = output as NeighborsOutput;
      if (!d.neighbors) return null;
      if (d.textSummary) {
        return (
          <TextSummaryWithData textSummary={d.textSummary}>
            <NeighborsRenderer data={d} />
          </TextSummaryWithData>
        );
      }
      return <NeighborsRenderer data={d} />;
    }
    case "runEnrichment": {
      const enrichObj = output as { textSummary?: string; enriched?: CompressedEnrichment[]; inputSize?: number; backgroundSize?: number };
      if (enrichObj.enriched && Array.isArray(enrichObj.enriched)) {
        if (enrichObj.textSummary) {
          return (
            <TextSummaryWithData textSummary={enrichObj.textSummary}>
              <EnrichmentRenderer results={enrichObj.enriched} />
            </TextSummaryWithData>
          );
        }
        return <EnrichmentRenderer results={enrichObj.enriched} />;
      }
      return null;
    }
    case "getConnections": {
      const d = output as { textSummary?: string };
      if (d.textSummary) {
        return <MessageResponse>{d.textSummary}</MessageResponse>;
      }
      return null;
    }
    case "compareEntities": {
      const d = output as { textSummary?: string };
      if (d.textSummary) {
        return <MessageResponse>{d.textSummary}</MessageResponse>;
      }
      return null;
    }
    case "getGwasAssociations": {
      const d = output as { totalHits?: number; uniqueTraits?: number; topAssociations: CompressedGwasAssociation[] };
      if (d.topAssociations) {
        return <GwasRenderer data={d} />;
      }
      return null;
    }
    case "getGeneVariantStats": {
      const d = output as CompressedGeneStats;
      if (d.gene && d.totalVariants != null) {
        return <GeneStatsRenderer data={d} />;
      }
      return null;
    }
    case "findPaths": {
      const fp = output as PathsResult;
      if (fp?.paths && Array.isArray(fp.paths)) {
        return <PathsRenderer paths={fp.paths as CompressedPath[]} />;
      }
      return null;
    }
    case "findPatterns": {
      const pat = output as PatternsResult;
      if (pat?.matches && Array.isArray(pat.matches)) {
        return <PatternsRenderer data={pat} />;
      }
      return null;
    }
    case "createCohort": {
      const d = output as CompressedCohort;
      if (d.cohortId) return <CohortRenderer data={d} />;
      return null;
    }
    case "planQuery":
    case "variantTriage":
    case "bioContext":
      // Handled by ActivityTimeline
      return null;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Run command summary helper
// ---------------------------------------------------------------------------

function getRunCommandSummary(
  command: string,
  inp: Record<string, unknown>,
): string {
  switch (command) {
    case "explore": {
      const seeds = inp.seeds as Array<{ label?: string; id?: string }> | undefined;
      const into = inp.into as string[] | undefined;
      const seedLabel = seeds?.[0]?.label ?? seeds?.[0]?.id ?? "entities";
      const targetLabel = into?.join(", ") ?? "neighbors";
      return `explore ${seedLabel} → ${targetLabel}`;
    }
    case "rows": {
      const sort = inp.sort as string | undefined;
      const limit = inp.limit as number | undefined;
      const parts = ["rows"];
      if (sort) parts.push(`sort: ${sort}`);
      if (limit) parts.push(`limit: ${limit}`);
      return parts.length > 1 ? `${parts[0]} (${parts.slice(1).join(", ")})` : parts[0];
    }
    case "groupby": {
      const groupBy = inp.group_by as string | undefined;
      return groupBy ? `group by ${groupBy}` : "group by";
    }
    case "correlation": {
      const x = inp.x as string | undefined;
      const y = inp.y as string | undefined;
      return x && y ? `correlation: ${x} vs ${y}` : "correlation";
    }
    case "derive": {
      const label = inp.label as string | undefined;
      return label ? `derive cohort: ${label}` : "derive cohort";
    }
    case "prioritize": {
      const criteria = inp.criteria as Array<{ column?: string }> | undefined;
      const cols = criteria?.map((c) => c.column).filter(Boolean).join(", ");
      return cols ? `prioritize by ${cols}` : "prioritize";
    }
    case "compute": {
      const weights = inp.weights as Array<{ column?: string }> | undefined;
      const cols = weights?.map((w) => w.column).filter(Boolean).join(", ");
      return cols ? `compute score: ${cols}` : "compute score";
    }
    case "analytics": {
      const method = inp.method as string | undefined;
      return method ? `analytics: ${method.replace(/_/g, " ")}` : "analytics";
    }
    case "analytics.poll": {
      return "polling analytics result";
    }
    case "viz": {
      const chartId = inp.chart_id as string | undefined;
      return chartId ? `viz: ${chartId}` : "generating visualization";
    }
    case "export":
      return "export cohort";
    case "create_cohort": {
      const refs = inp.references as string[] | undefined;
      return refs?.length ? `create cohort (${refs.length} variants)` : "create cohort";
    }
    case "enrich": {
      const inputSet = inp.input_set as unknown[] | undefined;
      const target = inp.target as string | undefined;
      return target
        ? `enrich ${inputSet?.length ?? "?"} genes → ${target}`
        : `enrich ${inputSet?.length ?? "?"} genes`;
    }
    case "traverse":
      return "traverse graph";
    case "paths": {
      const from = inp.from as string | undefined;
      const to = inp.to as string | undefined;
      return from && to ? `paths: ${from} → ${to}` : "find paths";
    }
    case "compare": {
      const entities = inp.entities as Array<{ label?: string; id?: string }> | undefined;
      const labels = entities?.map((e) => e.label ?? e.id ?? "?").join(" vs ");
      return labels ? `compare ${labels}` : "compare entities";
    }
    case "pin":
      return "pin entities";
    case "set_cohort":
      return "set active cohort";
    case "remember": {
      const key = inp.key as string | undefined;
      return key ? `remember: ${key}` : "saving memory";
    }
    default:
      return command;
  }
}

// ---------------------------------------------------------------------------
// Human-readable tool input summaries
// ---------------------------------------------------------------------------

export function getToolInputSummary(
  toolName: string,
  input: unknown,
): string | null {
  if (!input || typeof input !== "object") return null;

  const inp = input as Record<string, unknown>;
  const name = toolName.replace(/^tool-/, "");

  switch (name) {
    case "searchEntities": {
      const q = inp.query as string | undefined;
      const types = inp.types as string[] | undefined;
      if (!q) return null;
      return types?.length
        ? `Searching for "${q}" (${types.join(", ")})`
        : `Searching for "${q}"`;
    }
    case "getEntityContext": {
      const type = inp.type as string | undefined;
      const id = inp.id as string | undefined;
      if (!id) return null;
      return type ? `Getting context for ${type}:${id}` : `Getting context for ${id}`;
    }
    case "compareEntities": {
      const entities = inp.entities as Array<{ id?: string }> | undefined;
      if (!entities?.length) return null;
      return `Comparing ${entities.map((e) => e.id).join(" vs ")}`;
    }
    case "getRankedNeighbors": {
      const type = inp.type as string | undefined;
      const id = inp.id as string | undefined;
      const edge = inp.edgeType as string | undefined;
      if (!id) return null;
      return edge
        ? `Finding ${edge} neighbors of ${type ?? ""}:${id}`
        : `Finding neighbors of ${type ?? ""}:${id}`;
    }
    case "runEnrichment": {
      const genes = inp.genes as unknown[] | undefined;
      const targetType = inp.targetType as string | undefined;
      return targetType
        ? `Enrichment analysis for ${targetType} (${genes?.length ?? 0} genes)`
        : `Enrichment analysis (${genes?.length ?? 0} genes)`;
    }
    case "findPaths": {
      const from = inp.from as { type?: string; id?: string } | string | undefined;
      const to = inp.to as { type?: string; id?: string } | string | undefined;
      const fmtEntity = (e: { type?: string; id?: string } | string | undefined) => {
        if (!e) return null;
        if (typeof e === "string") return e;
        return e.type ? `${e.type}:${e.id}` : e.id;
      };
      const src = fmtEntity(from);
      const tgt = fmtEntity(to);
      if (!src || !tgt) return null;
      return `Finding paths from ${src} to ${tgt}`;
    }
    case "findPatterns": {
      const pattern = inp.pattern as Array<{ var?: string; type?: string; edge?: string }> | undefined;
      if (!pattern?.length) return null;
      const nodeVars = pattern.filter(p => p.var).map(p => p.type).join(", ");
      const edgeCount = pattern.filter(p => p.edge).length;
      return `Finding ${nodeVars} patterns (${edgeCount} edge constraints)`;
    }
    case "getSharedNeighbors": {
      const entities = inp.entities as Array<{ type?: string; id?: string }> | undefined;
      if (!entities?.length) return null;
      return `Finding shared neighbors of ${entities.map((e) => e.id ?? "?").join(", ")}`;
    }
    case "lookupVariant": {
      const id = inp.variantId as string | undefined;
      return id ? `Looking up variant ${id}` : null;
    }
    case "getGeneVariantStats": {
      const gene = inp.geneSymbol as string | undefined;
      return gene ? `Getting variant stats for ${gene}` : null;
    }
    case "getGwasAssociations": {
      const id = inp.entityId as string | undefined;
      return id ? `Looking up GWAS associations for ${id}` : null;
    }
    case "createCohort": {
      const variants = inp.variants as string[] | undefined;
      return variants?.length
        ? `Creating cohort with ${variants.length} variants`
        : "Creating cohort";
    }
    case "analyzeCohort": {
      const op = inp.operation as string | undefined;
      const cohortId = inp.cohortId as string | undefined;
      return op && cohortId
        ? `Running ${op} on cohort ${cohortId}`
        : "Analyzing cohort";
    }
    case "runAnalytics": {
      const task = inp.task as { type?: string } | undefined;
      const taskType = task?.type;
      if (taskType === "gwas_qc") return "Running GWAS QC";
      return taskType ? `Running ${taskType.replace(/_/g, " ")}` : "Running analytics";
    }
    case "getConnections": {
      const from = inp.from as { type?: string; id?: string } | undefined;
      const to = inp.to as { type?: string; id?: string } | undefined;
      if (!from?.id || !to?.id) return null;
      return `Finding connections between ${from.type ?? ""}:${from.id} and ${to.type ?? ""}:${to.id}`;
    }
    case "getEdgeDetail": {
      const f = inp.from as string | undefined;
      const t = inp.to as string | undefined;
      const et = inp.edgeType as string | undefined;
      if (!f || !t) return null;
      return et
        ? `Getting ${et} edge detail: ${f} → ${t}`
        : `Getting edge detail: ${f} → ${t}`;
    }
    case "graphTraverse": {
      return "Traversing knowledge graph";
    }
    case "variantBatchSummary": {
      const variants = inp.variants as string[] | undefined;
      return variants?.length
        ? `Summarizing ${variants.length} variants`
        : "Summarizing variant batch";
    }
    case "planQuery": {
      const uq = inp.userQuery as string | undefined;
      return uq
        ? `Planning: ${uq.length > 50 ? uq.slice(0, 47) + "..." : uq}`
        : "Planning query";
    }
    case "getGraphSchema": {
      const nt = inp.nodeType as string | undefined;
      return nt ? `Looking up schema for ${nt}` : "Looking up graph schema";
    }
    case "getCohortSchema": {
      const cid = inp.cohortId as string | undefined;
      return cid ? `Getting schema for cohort ${cid}` : "Getting cohort schema";
    }
    case "variantTriage": {
      const task = inp.task as string | undefined;
      return task
        ? `Analyzing: ${task.length > 60 ? task.slice(0, 57) + "..." : task}`
        : "Analyzing variants";
    }
    case "bioContext": {
      const task = inp.task as string | undefined;
      return task
        ? `Exploring: ${task.length > 60 ? task.slice(0, 57) + "..." : task}`
        : "Exploring graph";
    }
    case "State":
      return "Fetching workspace state";
    case "Read": {
      const path = inp.path as string | undefined;
      if (!path) return "Reading resource";
      return `Read ${path.length > 50 ? path.slice(0, 47) + "..." : path}`;
    }
    case "Search": {
      const q = inp.query as string | undefined;
      const scope = inp.scope as string | undefined;
      if (!q) return "Searching";
      return scope && scope !== "all"
        ? `Search "${q}" (${scope})`
        : `Search "${q}"`;
    }
    case "Run": {
      const cmd = inp.command as string | undefined;
      if (!cmd) return "Running command";
      return getRunCommandSummary(cmd, inp);
    }
    case "AskUser": {
      const question = inp.question as string | undefined;
      if (!question) return "Asking user";
      return question.length > 60
        ? question.slice(0, 57) + "..."
        : question;
    }
    default:
      return null;
  }
}
