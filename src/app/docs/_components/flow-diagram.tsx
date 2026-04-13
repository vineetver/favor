"use client";

import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/*  FlowNode                                                                   */
/* -------------------------------------------------------------------------- */

export function FlowNode({
  title,
  subtitle,
  items,
  guarantee,
  index = 0,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  items?: string[];
  guarantee?: string;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className="rounded-xl border border-border bg-card p-4"
    >
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {subtitle && (
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      )}
      {items && items.length > 0 && (
        <ul className="mt-2 space-y-1">
          {items.map((item) => (
            <li
              key={item}
              className="text-xs text-muted-foreground flex items-baseline gap-1.5"
            >
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0 mt-1.5" />
              {item}
            </li>
          ))}
        </ul>
      )}
      {guarantee && (
        <p className="mt-2 text-[10px] font-medium text-foreground bg-muted px-2 py-1 rounded inline-block">
          Guarantee: {guarantee}
        </p>
      )}
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/*  FlowConnector                                                              */
/* -------------------------------------------------------------------------- */

export function FlowConnector({
  label,
  artifact,
}: {
  label?: string;
  artifact?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 py-1">
      <div className="w-px h-4 bg-border" />
      {label && (
        <span className="inline-flex px-2.5 py-0.5 rounded-full bg-muted text-[11px] font-medium text-muted-foreground border border-border">
          {label}
          {artifact && (
            <span className="text-muted-foreground/70 ml-1.5">
              &rarr; {artifact}
            </span>
          )}
        </span>
      )}
      <ChevronDown className="w-4 h-4 text-muted-foreground" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  FlowDiagram                                                                */
/* -------------------------------------------------------------------------- */

export function FlowDiagram({ children }: { children: ReactNode }) {
  return <div className="flex flex-col items-stretch">{children}</div>;
}
