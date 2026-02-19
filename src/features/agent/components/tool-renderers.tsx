import type { ReactNode } from "react";

import { Badge } from "@shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/components/ui/table";
import type {
  CompressedSearchResult,
  CompressedNeighbor,
  CompressedEnrichment,
  CompressedGwasAssociation,
  CompressedGeneStats,
  CompressedPath,
  CompressedCohort,
  ReportPlanOutput,
  SubagentOutput,
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

type PlanItemStatus = "completed" | "in-progress" | "pending";

function getPlanItemStatus(
  item: { tools: string[] },
  siblingToolParts: ToolUIPart[],
): PlanItemStatus {
  if (item.tools.length > 0) {
    const matchingParts = siblingToolParts.filter((p) => {
      const name = p.toolName ?? (p.type ?? "").replace(/^tool-/, "");
      return item.tools.includes(name);
    });

    if (matchingParts.length === 0) return "pending";

    const hasCompleted = matchingParts.some(
      (p) => p.state === "output-available" || p.state === "output-error",
    );
    if (hasCompleted) return "completed";

    const hasInProgress = matchingParts.some(
      (p) => p.state === "input-available" || p.state === "streaming",
    );
    if (hasInProgress) return "in-progress";

    return "pending";
  }

  // Synthesis / analysis step (no specific tools declared).
  // Infer status from whether all sibling tool calls have finished.
  if (siblingToolParts.length === 0) return "pending";

  const allDone = siblingToolParts.every(
    (p) => p.state === "output-available" || p.state === "output-error",
  );
  if (allDone) return "completed";

  const anyRunning = siblingToolParts.some(
    (p) => p.state === "input-available" || p.state === "streaming",
  );
  if (anyRunning) return "in-progress";

  return "pending";
}

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

export function PlanRenderer({
  plan,
  siblingToolParts,
}: {
  plan: ReportPlanOutput;
  siblingToolParts: ToolUIPart[];
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <svg
          className="size-4 text-muted-foreground"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M16 3h5v5" />
          <path d="M8 3H3v5" />
          <path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3" />
          <path d="m15 9 6-6" />
        </svg>
        <span className="text-sm font-medium text-foreground">
          Analysis Plan
        </span>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {QUERY_TYPE_LABELS[plan.queryType] ?? plan.queryType}
        </Badge>
      </div>
      <div className="space-y-1">
        {plan.plan.map((item) => {
          const status = getPlanItemStatus(item, siblingToolParts);
          return (
            <div key={item.id} className="flex items-center gap-2 text-sm">
              {status === "completed" && (
                <svg
                  className="size-4 shrink-0 text-emerald-600"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <path d="m9 11 3 3L22 4" />
                </svg>
              )}
              {status === "in-progress" && (
                <svg
                  className="size-4 shrink-0 text-primary animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              )}
              {status === "pending" && (
                <svg
                  className="size-4 shrink-0 text-muted-foreground/40"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                </svg>
              )}
              <span
                className={
                  status === "completed"
                    ? "text-muted-foreground line-through"
                    : status === "in-progress"
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                }
              >
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subagent Renderer
// ---------------------------------------------------------------------------

export function SubagentRenderer({ data }: { data: SubagentOutput }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>{data.stepsUsed} steps</span>
        <span>{data.toolCallsMade} tool calls</span>
        {data.toolsUsed.length > 0 && (
          <span>Tools: {data.toolsUsed.join(", ")}</span>
        )}
      </div>
      {data.summary && (
        <p className="text-sm text-foreground whitespace-pre-wrap">
          {data.summary}
        </p>
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
    case "reportPlan":
      // Handled specially in chat-page.tsx as a standalone PlanRenderer
      return null;
    case "graphExplorer":
    case "variantAnalyzer": {
      const d = output as SubagentOutput;
      if (d.summary) return <SubagentRenderer data={d} />;
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
    case "reportPlan": {
      const qt = inp.queryType as string | undefined;
      const label = qt ? QUERY_TYPE_LABELS[qt] ?? qt : "query";
      return `Planning: ${label}`;
    }
    case "getGraphSchema": {
      const nt = inp.nodeType as string | undefined;
      return nt ? `Looking up schema for ${nt}` : "Looking up graph schema";
    }
    case "graphExplorer": {
      const task = inp.task as string | undefined;
      return task
        ? `Exploring: ${task.length > 60 ? task.slice(0, 57) + "..." : task}`
        : "Exploring graph";
    }
    case "variantAnalyzer": {
      const task = inp.task as string | undefined;
      return task
        ? `Analyzing: ${task.length > 60 ? task.slice(0, 57) + "..." : task}`
        : "Analyzing variants";
    }
    default:
      return null;
  }
}
