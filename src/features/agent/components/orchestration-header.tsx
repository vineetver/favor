"use client";

import { useMemo } from "react";
import { cn } from "@infra/utils";
import { inferOrchestration, type OrchestrationPhase } from "../lib/infer-orchestration";

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
}: {
  toolParts: ToolUIPart[];
  isStreaming: boolean;
  hasTextContent: boolean;
}) {
  const orch = useMemo(
    () => inferOrchestration(toolParts, isStreaming, hasTextContent),
    [toolParts, isStreaming, hasTextContent],
  );

  const activeIdx = phaseIndex(orch.phase);

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

      {/* Phase label only */}
      <span className="font-medium text-muted-foreground">
        {orch.phaseLabel}
      </span>
    </div>
  );
}
