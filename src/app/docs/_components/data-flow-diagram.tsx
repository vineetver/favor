"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { motion } from "motion/react";

interface FlowStep {
  label: string;
  detail?: string;
}

export function DataFlowDiagram({
  title,
  steps,
}: {
  title: string;
  steps: FlowStep[];
}) {
  return (
    <div className="bg-muted rounded-xl p-5 sm:p-6 border border-border">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">
        {title}
      </p>

      {/* Desktop: horizontal */}
      <div className="hidden sm:flex items-stretch gap-1.5">
        {steps.map((step, i) => (
          <div key={step.label} className="contents">
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className="flex-1 rounded-lg bg-card border border-border p-3"
            >
              <p className="text-xs font-semibold text-foreground">
                {step.label}
              </p>
              {step.detail && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {step.detail}
                </p>
              )}
            </motion.div>
            {i < steps.length - 1 && (
              <div className="flex items-center shrink-0">
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: vertical */}
      <div className="sm:hidden flex flex-col items-stretch gap-1">
        {steps.map((step, i) => (
          <div key={step.label}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              className="rounded-lg bg-card border border-border p-3"
            >
              <p className="text-xs font-semibold text-foreground">
                {step.label}
              </p>
              {step.detail && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {step.detail}
                </p>
              )}
            </motion.div>
            {i < steps.length - 1 && (
              <div className="flex justify-center py-0.5">
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
