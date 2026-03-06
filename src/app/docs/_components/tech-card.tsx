"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@infra/utils";

export function TechCard({
  name,
  purpose,
  stat,
  statLabel,
  details,
  headlineCount = 3,
  index = 0,
}: {
  name: string;
  purpose: string;
  stat: string;
  statLabel: string;
  details: string[];
  headlineCount?: number;
  index?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasOverflow = details.length > headlineCount;
  const visible = expanded ? details : details.slice(0, headlineCount);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="rounded-xl border border-border bg-card p-5"
    >
      <p className="text-sm font-semibold text-foreground">{name}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{purpose}</p>
      <div className="mt-3">
        <p className="text-2xl font-bold text-foreground">{stat}</p>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mt-0.5">
          {statLabel}
        </p>
      </div>
      <ul className="mt-3 space-y-1">
        {visible.map((d) => (
          <li
            key={d}
            className="text-xs text-muted-foreground flex items-baseline gap-1.5"
          >
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40 shrink-0 mt-1.5" />
            {d}
          </li>
        ))}
      </ul>
      {hasOverflow && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {expanded ? "Show less" : `${details.length - headlineCount} more ops`}
          <ChevronDown
            className={cn(
              "w-3 h-3 transition-transform",
              expanded && "rotate-180",
            )}
          />
        </button>
      )}
    </motion.div>
  );
}
