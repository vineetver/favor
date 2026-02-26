"use client";

import { cn } from "@infra/utils";
import { Check } from "lucide-react";
import { STAGE_CONFIG, STAGE_ORDER } from "../constants";
import type { ProcessingStage } from "../types";

interface ProcessingPipelineProps {
  currentStage: ProcessingStage;
  className?: string;
}

/**
 * Visual pipeline showing processing stages
 *
 * Apple-inspired design: Clean, minimal, with subtle animations.
 * Shows all stages as a horizontal timeline with the current stage highlighted.
 */
export function ProcessingPipeline({ currentStage, className }: ProcessingPipelineProps) {
  const currentIndex = STAGE_ORDER.indexOf(currentStage);

  return (
    <div className={cn("w-full", className)}>
      {/* Pipeline steps */}
      <div className="flex items-center justify-between">
        {STAGE_ORDER.map((stage, index) => {
          const config = STAGE_CONFIG[stage];
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isPending = index > currentIndex;
          const isLast = index === STAGE_ORDER.length - 1;

          return (
            <div key={stage} className="flex items-center flex-1 last:flex-none">
              {/* Stage indicator */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "relative flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-all duration-300",
                    isCompleted && "bg-emerald-500 text-white",
                    isCurrent && "bg-primary text-white ring-4 ring-primary/20",
                    isPending && "bg-slate-100 text-slate-400"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <span className={cn(
                      "h-2 w-2 rounded-full",
                      isCurrent && "bg-white animate-pulse",
                      isPending && "bg-slate-300"
                    )} />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] font-medium uppercase tracking-wide transition-colors",
                    isCompleted && "text-emerald-600",
                    isCurrent && "text-primary",
                    isPending && "text-slate-400"
                  )}
                >
                  {config.shortLabel}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 mx-2 h-0.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isCompleted ? "bg-emerald-400 w-full" : "w-0"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Current stage description */}
      {STAGE_CONFIG[currentStage] && (
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            {STAGE_CONFIG[currentStage].description}
          </p>
        </div>
      )}
    </div>
  );
}
