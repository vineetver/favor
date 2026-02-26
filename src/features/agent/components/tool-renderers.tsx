import { useState, type ReactNode } from "react";

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
import { cn } from "@infra/utils";
import type {
  CompressedSearchResult,
  CompressedNeighbor,
  CompressedEnrichment,
  CompressedGwasAssociation,
  CompressedGeneStats,
  CompressedPath,
  CompressedCohort,
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
// Search Results
// ---------------------------------------------------------------------------

function SearchResultsRenderer({
  results,
}: {
  results: CompressedSearchResult[];
}) {
  if (!results.length) return <p className="text-xs text-muted-foreground">No results found.</p>;
  return (
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
  );
}

// ---------------------------------------------------------------------------
// Ranked Neighbors
// ---------------------------------------------------------------------------

interface NeighborsOutput {
  scoreField?: string;
  scoreMeaning?: string;
  totalReturned?: number;
  neighbors: CompressedNeighbor[];
}

function NeighborsRenderer({ data }: { data: NeighborsOutput }) {
  const neighbors = data.neighbors;
  if (!neighbors?.length) return <p className="text-xs text-muted-foreground">No neighbors found.</p>;
  return (
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
            <TableCell className="tabular-nums text-muted-foreground">{n.rank}</TableCell>
            <TableCell className="font-medium">{n.entity.label}</TableCell>
            <TableCell><TypeBadge type={n.entity.type} /></TableCell>
            {n.score != null && (
              <TableCell className="text-right tabular-nums">{fmt(n.score)}</TableCell>
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
            <TableCell className="font-medium">{r.entity.label}</TableCell>
            <TableCell><TypeBadge type={r.entity.type} /></TableCell>
            <TableCell className="text-right tabular-nums">{r.overlap}</TableCell>
            <TableCell className="text-right tabular-nums">{fmt(r.pValue)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmt(r.adjustedPValue)}</TableCell>
            <TableCell className="text-right tabular-nums">{fmt(r.foldEnrichment)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// GWAS
// ---------------------------------------------------------------------------

function GwasRenderer({
  data,
}: {
  data:
    | CompressedGwasAssociation[]
    | {
        totalHits?: number;
        uniqueTraits?: number;
        topAssociations: CompressedGwasAssociation[];
      };
}) {
  const associations = Array.isArray(data) ? data : data.topAssociations;
  const meta = !Array.isArray(data) ? data : null;

  if (!associations?.length) return <p className="text-xs text-muted-foreground">No GWAS associations found.</p>;

  return (
    <div className="space-y-2">
      {meta && (
        <div className="flex gap-3 text-xs text-muted-foreground">
          {meta.totalHits != null && <span>{meta.totalHits} total hits</span>}
          {meta.uniqueTraits != null && <span>{meta.uniqueTraits} unique traits</span>}
        </div>
      )}
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
              <TableCell className="text-right tabular-nums">{fmt(a.pValueMlog)}</TableCell>
              {a.effectSize && (
                <TableCell className="text-right tabular-nums">{a.effectSize}</TableCell>
              )}
              {a.studyAccession && (
                <TableCell className="font-mono text-xs text-muted-foreground">{a.studyAccession}</TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
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

interface ToolUIPart {
  type: string;
  toolCallId?: string;
  toolName?: string;
  state?: string;
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

const QUERY_TYPE_LABELS: Record<string, string> = {
  entity_lookup: "Entity Lookup",
  variant_analysis: "Variant Analysis",
  graph_exploration: "Graph Exploration",
  cohort_analysis: "Cohort Analysis",
  comparison: "Comparison",
  connection: "Connection",
  drug_discovery: "Drug Discovery",
  general: "General",
};

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
    const taskPreview = step.task.length > 50 ? step.task.slice(0, 47) + "..." : step.task;
    return `${agentLabel}: ${taskPreview}`;
  }
  if (step.do === "synthesize") return "Synthesize findings";
  return "Processing";
}

const AGENT_BADGES: Record<string, string> = {
  variantTriage: "Variant",
  bioContext: "Graph",
};

/** Compute statuses for plan steps */
function computePlanStatuses(
  steps: PlanStep[],
  siblingToolParts: ToolUIPart[],
  isStreaming: boolean,
): PlanItemStatus[] {
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

  const toolStepStatuses = steps.map((step) => {
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
  if (status === "completed") return "text-muted-foreground line-through";
  if (status === "errored") return "text-amber-600";
  if (status === "in-progress") return "text-foreground font-medium";
  return "text-muted-foreground";
}

export function PlanRenderer({
  plan,
  siblingToolParts,
  isStreaming = true,
}: {
  plan: AgentPlan;
  siblingToolParts: ToolUIPart[];
  isStreaming?: boolean;
}) {
  const statuses = computePlanStatuses(plan.steps, siblingToolParts, isStreaming);
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <svg className="size-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" /><path d="m15 9 6-6" />
        </svg>
        <span className="text-sm font-medium text-foreground">Analysis Plan</span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {QUERY_TYPE_LABELS[plan.queryType] ?? plan.queryType}
        </Badge>
      </div>
      <div className="space-y-1">
        {plan.steps.map((step, idx) => {
          const status = statuses[idx];
          const label = getPlanStepLabel(step);
          const agentBadge = step.do === "delegate" ? AGENT_BADGES[step.agent] : null;
          return (
            <div key={`${step.do}-${idx}`} className="flex items-center gap-2 text-sm">
              <StatusIcon status={status} />
              {agentBadge && (
                <Badge variant="secondary" className="text-[9px] px-1 py-0">{agentBadge}</Badge>
              )}
              <span className={statusTextClass(status)}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subagent Tool Trace Timeline
// ---------------------------------------------------------------------------

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  analyzeCohort: "Analyze Cohort",
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
  getSharedNeighbors: "Shared Neighbors",
  getConnections: "Connections",
  getEdgeDetail: "Edge Detail",
  graphTraverse: "Graph Traverse",
  compareEntities: "Compare",
  runEnrichment: "Enrichment",
  getGraphSchema: "Graph Schema",
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

const AGENT_ICONS: Record<string, ReactNode> = {
  variantTriage: (
    <svg className="size-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 15c6.667-6 13.333 0 20-6" /><path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993" /><path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993" /><path d="m17 6-2.5-2.5" /><path d="m14 8-1-1" /><path d="m7 18 2.5 2.5" /><path d="m3.5 14.5.5.5" /><path d="m10 16 1 1" />
    </svg>
  ),
  bioContext: (
    <svg className="size-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" /><path d="M3.34 17a10 10 0 0 1 0-10" /><path d="M20.66 17a10 10 0 0 0 0-10" /><path d="M7.5 4.21a10 10 0 0 1 9 0" /><path d="M7.5 19.79a10 10 0 0 0 9 0" />
    </svg>
  ),
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

export function SubagentRenderer({
  data,
  agentType,
}: {
  data: VariantTriageOutput | BioContextOutput;
  agentType?: "variantTriage" | "bioContext";
}) {
  const traces = "toolTrace" in data ? (data as VariantTriageOutput | BioContextOutput).toolTrace : undefined;
  const evidenceRefs = "evidenceRefs" in data ? (data as VariantTriageOutput | BioContextOutput).evidenceRefs : undefined;

  return (
    <div className="space-y-3">
      {/* Header: agent type + stats */}
      <div className="flex items-center gap-2 flex-wrap">
        {agentType && (
          <div className="inline-flex items-center gap-1.5 rounded-md bg-primary/8 border border-primary/15 px-2 py-0.5">
            <span className="text-primary">
              {AGENT_ICONS[agentType] ?? null}
            </span>
            <span className="text-[11px] font-semibold text-primary">
              {AGENT_TYPE_LABELS[agentType] ?? agentType}
            </span>
          </div>
        )}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>{data.stepsUsed} step{data.stepsUsed !== 1 ? "s" : ""}</span>
          <span className="text-border">&middot;</span>
          <span>{data.toolCallsMade} tool call{data.toolCallsMade !== 1 ? "s" : ""}</span>
          <span className="text-border">&middot;</span>
          <span>{data.toolsUsed.length} tool{data.toolsUsed.length !== 1 ? "s" : ""} used</span>
        </div>
      </div>

      {/* Tool trace timeline (expandable items) */}
      {traces && traces.length > 0 ? (
        <SubagentTraceTimeline traces={traces} />
      ) : data.toolsUsed.length > 0 ? (
        <div className="text-xs text-muted-foreground">
          {data.toolCallsMade} tool calls: {data.toolsUsed.join(", ")}
        </div>
      ) : null}

      {/* Structured highlights */}
      {("topGenes" in data && data.topGenes && data.topGenes.length > 0) ||
       ("entities" in data && data.entities && data.entities.length > 0) ||
       ("pathways" in data && data.pathways && data.pathways.length > 0)
        ? (
          <div className="space-y-1.5">
            {"topGenes" in data && data.topGenes && data.topGenes.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Top genes
                </span>
                {data.topGenes.slice(0, 8).map((g) => (
                  <Badge key={g.symbol} variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                    {g.symbol}
                    {g.variantCount != null && (
                      <span className="ml-1 text-muted-foreground/60">{g.variantCount}</span>
                    )}
                  </Badge>
                ))}
              </div>
            )}
            {"entities" in data && data.entities && data.entities.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Entities
                </span>
                {data.entities.slice(0, 8).map((e) => (
                  <Badge key={e.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                    <span className="text-muted-foreground/60 mr-1">{e.type}</span>
                    {e.label}
                  </Badge>
                ))}
              </div>
            )}
            {"pathways" in data && data.pathways && data.pathways.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Pathways
                </span>
                {data.pathways.slice(0, 8).map((p) => (
                  <Badge key={p.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {p.label}
                    {p.pValue != null && (
                      <span className="ml-1 text-muted-foreground/60">p={fmt(p.pValue)}</span>
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : null}

      {/* Summary text */}
      {data.summary && (
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {data.summary}
        </p>
      )}

      {/* Evidence refs */}
      {evidenceRefs && evidenceRefs.length > 0 && (
        <EvidenceRefsSummary refs={evidenceRefs} />
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
      if (d.neighbors) return <NeighborsRenderer data={d} />;
      return null;
    }
    case "runEnrichment": {
      if (Array.isArray(output)) {
        return <EnrichmentRenderer results={output as CompressedEnrichment[]} />;
      }
      return null;
    }
    case "getGwasAssociations": {
      const d = output as
        | CompressedGwasAssociation[]
        | { topAssociations: CompressedGwasAssociation[] };
      if (Array.isArray(d) || ("topAssociations" in d && d.topAssociations)) {
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
      if (Array.isArray(output)) {
        return <PathsRenderer paths={output as CompressedPath[]} />;
      }
      return null;
    }
    case "createCohort": {
      const d = output as CompressedCohort;
      if (d.cohortId) return <CohortRenderer data={d} />;
      return null;
    }
    case "planQuery":
      // Handled specially in chat-page.tsx as a standalone PlanRenderer
      return null;
    case "variantTriage": {
      const d = output as VariantTriageOutput;
      if (d.summary) return <SubagentRenderer data={d} agentType="variantTriage" />;
      return null;
    }
    case "bioContext": {
      const d = output as BioContextOutput;
      if (d.summary) return <SubagentRenderer data={d} agentType="bioContext" />;
      return null;
    }
    default:
      return null;
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
      const id = inp.entityId as string | undefined;
      const type = inp.entityType as string | undefined;
      if (!id) return null;
      return type ? `Getting context for ${type} ${id}` : `Getting context for ${id}`;
    }
    case "compareEntities": {
      const entities = inp.entities as Array<{ id?: string }> | undefined;
      if (!entities?.length) return null;
      return `Comparing ${entities.map((e) => e.id).join(" vs ")}`;
    }
    case "getRankedNeighbors": {
      const id = inp.entityId as string | undefined;
      const type = inp.neighborType as string | undefined;
      if (!id) return null;
      return type
        ? `Finding ${type} neighbors of ${id}`
        : `Finding neighbors of ${id}`;
    }
    case "runEnrichment": {
      const geneSet = inp.geneSet as string[] | undefined;
      const lib = inp.library as string | undefined;
      return lib
        ? `Enrichment analysis against ${lib} (${geneSet?.length ?? 0} genes)`
        : `Enrichment analysis (${geneSet?.length ?? 0} genes)`;
    }
    case "findPaths": {
      const src = inp.sourceId as string | undefined;
      const tgt = inp.targetId as string | undefined;
      if (!src || !tgt) return null;
      return `Finding paths from ${src} to ${tgt}`;
    }
    case "getSharedNeighbors": {
      const entities = inp.entityIds as string[] | undefined;
      if (!entities?.length) return null;
      return `Finding shared neighbors of ${entities.join(", ")}`;
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
    default:
      return null;
  }
}
