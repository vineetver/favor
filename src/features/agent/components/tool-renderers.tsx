import { cn } from "@infra/utils";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@shared/components/ui/collapsible";
import { ChevronDownIcon } from "lucide-react";
import { useState } from "react";
import { type ArtifactRef, isArtifactRef } from "../lib/compact-message";
import type {
  AgentPlan,
  BioContextOutput,
  EvidenceRef,
  PlanStep,
  SubagentToolTrace,
  VariantTriageOutput,
} from "../types";
import { getToolInputSummary } from "./tool-renderer-input-summary";
import { renderToolOutput } from "./tool-renderer-outputs";

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
    const agentLabel =
      step.agent === "variantTriage" ? "Cohort Analysis" : "Knowledge Graph";
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
    const name = normToolName(
      p.toolName ?? (p.type ?? "").replace(/^tool-/, ""),
    );
    // Not claimed by any resolve/delegate step
    return ![...claimedNames].some((cn) => toolNameMatches(cn, name));
  });

  const getToolPartStatus = (toolName: string): PlanItemStatus => {
    const matching = siblingToolParts.filter((p) => {
      const name = p.toolName ?? (p.type ?? "").replace(/^tool-/, "");
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
    const hasSuccess = unclaimedParts.some(
      (p) => p.state === "output-available",
    );
    const hasError = unclaimedParts.some((p) => p.state === "output-error");
    const hasRunning = unclaimedParts.some((p) =>
      RUNNING_STATES.has(p.state ?? ""),
    );
    if (hasRunning) return "in-progress";
    if (hasSuccess) return "completed";
    if (hasError) return "errored";
    return "in-progress"; // parts exist but in unknown state — treat as running
  };

  const toolStepStatuses = steps.map((step) => {
    if (step.do === "direct" || step.do === "batch")
      return getUnclaimedStatus();
    const toolName = planStepToToolName(step);
    if (!toolName) return "pending" as PlanItemStatus; // synthesize step
    return getToolPartStatus(toolName);
  });

  return steps.map((step, i) => {
    if (step.do === "synthesize") {
      const allOthersDone = steps.every((s, j) => {
        if (s.do === "synthesize") return true;
        return (
          toolStepStatuses[j] === "completed" ||
          toolStepStatuses[j] === "errored"
        );
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
    );
  }
  if (status === "in-progress") {
    return (
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
    );
  }
  if (status === "errored") {
    return (
      <svg
        className="size-4 shrink-0 text-amber-500"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  }
  return (
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
      <svg
        className="size-3 shrink-0 text-emerald-600"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="m9 11 3 3L22 4" />
      </svg>
    );
  }
  return (
    <svg
      className="size-3 shrink-0 text-destructive"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
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
    ([, v]) =>
      typeof v === "string" || typeof v === "number" || typeof v === "boolean",
  );

  if (isSimple && entries.length <= 6) {
    return (
      <div className="space-y-0.5">
        {entries.map(([key, val]) => (
          <div key={key} className="flex items-baseline gap-2 text-[11px]">
            <span className="font-mono text-muted-foreground/70 shrink-0 min-w-[100px]">
              {key}
            </span>
            <span className="text-foreground font-mono break-all">
              {String(val)}
            </span>
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
        {isLong && !expanded ? `${json.slice(0, 2000)}\n...` : json}
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
      <span className="text-[11px] text-muted-foreground font-mono">
        {String(output)}
      </span>
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
      {json.length > 2000 ? `${json.slice(0, 2000)}\n...` : json}
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
        <svg
          className="size-3.5 text-muted-foreground"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="6" height="16" x="4" y="2" rx="2" />
          <rect width="6" height="9" x="14" y="9" rx="2" />
          <path d="M22 22H2" />
        </svg>
        <span className="text-[11px] font-semibold text-foreground">
          Tool Calls
        </span>
        <span className="text-[10px] text-muted-foreground">
          {traces.length} total
        </span>
        {successCount > 0 && (
          <span className="text-[10px] text-emerald-600">
            {successCount} passed
          </span>
        )}
        {errorCount > 0 && (
          <span className="text-[10px] text-destructive">
            {errorCount} failed
          </span>
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
                <span className="font-medium text-foreground shrink-0">
                  {displayName}
                </span>
                <span
                  className="text-muted-foreground truncate"
                  title={t.inputSummary}
                >
                  {t.inputSummary}
                </span>
                {t.outputSummary && (
                  <>
                    <span className="text-muted-foreground/40 shrink-0">
                      &rarr;
                    </span>
                    <span
                      className={cn(
                        "truncate",
                        t.status === "error"
                          ? "text-destructive/80"
                          : "text-muted-foreground",
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
            <TraceExpandableItem
              key={`${t.toolName}-${i}`}
              trace={t}
              displayName={displayName}
            />
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
        <span className="font-medium text-foreground shrink-0">
          {displayName}
        </span>
        <span
          className="text-muted-foreground truncate"
          title={trace.inputSummary}
        >
          {trace.inputSummary}
        </span>
        {trace.outputSummary && (
          <>
            <span className="text-muted-foreground/40 shrink-0">&rarr;</span>
            <span
              className={cn(
                "truncate flex-1 text-left",
                trace.status === "error"
                  ? "text-destructive/80"
                  : "text-muted-foreground",
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
              <div
                className={cn(
                  "rounded-md border px-2.5 py-2",
                  trace.status === "error"
                    ? "bg-destructive/[0.02] border-destructive/10"
                    : "bg-muted/40 border-border/50",
                )}
              >
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
        <svg
          className="size-3 text-muted-foreground/50"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        </svg>
        <span className="font-medium">
          {refs.length} data source{refs.length !== 1 ? "s" : ""}
        </span>
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
              {count > 1 && (
                <span className="text-muted-foreground/60">&times;{count}</span>
              )}
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
    const output = subagentPart.output as
      | VariantTriageOutput
      | BioContextOutput;
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
        {inputSummary ?? TOOL_DISPLAY_NAMES[toolName] ?? toolName}
      </span>
      {summary && (
        <span className="text-[11px] text-muted-foreground truncate max-w-[50%]">
          {summary.length > 80 ? `${summary.slice(0, 77)}...` : summary}
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
    if (!hasOutput || !part.output || typeof part.output !== "object")
      return null;
    const out = part.output as Record<string, unknown>;
    if (out.error === true) {
      const msg = (out.message as string) ?? "Error";
      return msg.length > 60 ? `${msg.slice(0, 57)}...` : msg;
    }
    if (typeof out.text_summary === "string") {
      const ts = out.text_summary as string;
      return ts.length > 80 ? `${ts.slice(0, 77)}...` : ts;
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
          <span
            className={cn(statusTextClass(status), "flex-1 text-left min-w-0")}
          >
            {inputSummary ?? displayName}
          </span>
          {outputBrief && (
            <span
              className={cn(
                "text-[11px] truncate max-w-[40%]",
                isError ? "text-destructive/70" : "text-muted-foreground",
              )}
            >
              {outputBrief}
            </span>
          )}
          <ChevronDownIcon className="size-3 shrink-0 text-muted-foreground/40 transition-transform duration-200 group-data-[state=open]/dt:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-6 mt-1.5 mb-1 space-y-2.5">
            {part.input != null &&
              typeof part.input === "object" &&
              Object.keys(part.input as object).length > 0 && (
                <div className="space-y-1">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Input
                  </span>
                  <div className="rounded-md bg-muted/40 border border-border/50 px-2.5 py-2">
                    <TraceInputDisplay
                      input={part.input as Record<string, unknown>}
                    />
                  </div>
                </div>
              )}
            <div className="space-y-1">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Output
              </span>
              <div
                className={cn(
                  "rounded-md border px-2.5 py-2",
                  isError
                    ? "bg-destructive/[0.02] border-destructive/10"
                    : "bg-muted/40 border-border/50",
                )}
              >
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
    const statuses = computePlanStatuses(
      plan.steps,
      siblingToolParts,
      isStreaming,
    );

    // Collect tool names claimed by resolve/delegate steps
    const claimedNames = new Set<string>();
    for (const step of plan.steps) {
      const tn = planStepToToolName(step);
      if (tn) claimedNames.add(normToolName(tn));
    }
    // Unclaimed = direct tool calls triggered by direct/batch steps
    const unclaimedParts = siblingToolParts.filter((p) => {
      const name = normToolName(
        p.toolName ?? (p.type ?? "").replace(/^tool-/, ""),
      );
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
            {(step.do === "direct" || step.do === "batch") &&
              unclaimedParts.length > 0 && (
                <div className="ml-6 space-y-0.5">
                  {unclaimedParts.map((part, pidx) => (
                    <DirectToolLine
                      key={part.toolCallId ?? `unclaimed-${pidx}`}
                      part={part}
                    />
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
