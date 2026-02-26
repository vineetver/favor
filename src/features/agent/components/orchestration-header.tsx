"use client";

import { useMemo, useRef } from "react";
import { cn } from "@infra/utils";
import { inferOrchestration, type OrchestrationPhase } from "../lib/infer-orchestration";
import type { ReportPlanOutput, AgentPlan } from "../types";

const PHASES: { key: OrchestrationPhase; label: string }[] = [
  { key: "resolve", label: "Resolve" },
  { key: "explore", label: "Explore" },
  { key: "synthesize", label: "Synthesize" },
];

function phaseIndex(phase: OrchestrationPhase): number {
  return PHASES.findIndex((p) => p.key === phase);
}

interface ToolUIPart {
  type: string;
  toolName?: string;
  state?: string;
  input?: unknown;
}

export function OrchestrationHeader({
  toolParts,
  isStreaming,
  hasTextContent,
  planOutput,
}: {
  toolParts: ToolUIPart[];
  isStreaming: boolean;
  hasTextContent: boolean;
  planOutput?: ReportPlanOutput | AgentPlan | null;
}) {
  const orch = useMemo(
    () => inferOrchestration(toolParts, isStreaming, hasTextContent, planOutput),
    [toolParts, isStreaming, hasTextContent, planOutput],
  );

  // Phase can only advance (resolve → explore → synthesize), never regress.
  // Prevents flickering caused by transient tool-part states during streaming.
  const highWaterRef = useRef(0);
  const currentIdx = phaseIndex(orch.phase);
  if (currentIdx > highWaterRef.current) {
    highWaterRef.current = currentIdx;
  }
  const activeIdx = highWaterRef.current;

  return (
    <div className="flex items-center gap-2.5 text-[11px]">
      {/* Phase dots with connecting lines */}
      <div className="flex items-center">
        {PHASES.map((p, i) => {
          const isComplete = i < activeIdx;
          const isActive = i === activeIdx;

          return (
            <div key={p.key} className="flex items-center">
              {i > 0 && (
                <span
                  className={cn(
                    "h-px w-3",
                    i <= activeIdx ? "bg-primary/50" : "bg-border",
                  )}
                />
              )}
              <span
                className={cn(
                  "size-1.5 rounded-full transition-colors",
                  isComplete && "bg-primary",
                  isActive && "bg-primary animate-pulse",
                  !isComplete && !isActive && "bg-muted-foreground/25",
                )}
              />
            </div>
          );
        })}
      </div>

      {/* Phase label — uses high-water phase to prevent regression */}
      <span className="font-medium text-muted-foreground">
        {PHASES[activeIdx].label === "Resolve"
          ? "Resolving"
          : PHASES[activeIdx].label === "Explore"
            ? "Exploring"
            : "Synthesizing"}
      </span>
    </div>
  );
}
