"use client";

import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Variant } from "../types/types";
import { BADGE_COLORS, type BadgeColor, type ColumnMeta } from "@/lib/table/column-builder";
import { chromatinStateColumns } from "../config/hg38/columns/chromatin-state";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Build a map of column ID -> tooltip content from the column definitions
const CHROMATIN_TOOLTIPS: Record<string, ReactNode> = {};
chromatinStateColumns.forEach((col) => {
  if (col.id) {
    const meta = col.meta as ColumnMeta | undefined;
    if (meta?.description) {
      CHROMATIN_TOOLTIPS[col.id] = meta.description;
    }
  }
});

// HeaderTooltip matching the style of category-data-view
function HeaderTooltip({ content }: { content: ReactNode }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-5 w-5 cursor-help flex-shrink-0 fill-black text-white ring-transparent outline-transparent border-transparent" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-md">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Chromatin state categories using badge colors
const CHROMATIN_CATEGORIES: Record<string, {
  label: string;
  color: BadgeColor;
  barClass: string;
  description: string;
}> = {
  promoter: {
    label: "Promoter",
    color: "red",
    barClass: "bg-red-400",
    description: "Regions associated with transcription start sites and gene promoters",
  },
  transcription: {
    label: "Transcription",
    color: "emerald",
    barClass: "bg-emerald-400",
    description: "Regions actively being transcribed into RNA",
  },
  enhancer: {
    label: "Enhancer",
    color: "orange",
    barClass: "bg-orange-400",
    description: "Active enhancer regions that increase gene expression",
  },
  weak: {
    label: "Weak Enhancer",
    color: "amber",
    barClass: "bg-amber-400",
    description: "Regions with weak enhancer activity",
  },
  other: {
    label: "Other",
    color: "sky",
    barClass: "bg-sky-400",
    description: "Other regulatory elements including DNase-only and repeat regions",
  },
  heterochromatin: {
    label: "Heterochromatin",
    color: "stone",
    barClass: "bg-stone-400",
    description: "Tightly packed, transcriptionally inactive chromatin",
  },
  repressed: {
    label: "Repressed",
    color: "purple",
    barClass: "bg-purple-400",
    description: "Regions silenced by Polycomb or other repressive mechanisms",
  },
  quiescent: {
    label: "Quiescent",
    color: "gray",
    barClass: "bg-gray-400",
    description: "Inactive regions with low signal across all marks",
  },
};

type CategoryKey = keyof typeof CHROMATIN_CATEGORIES;

// Chromatin state definitions
const CHROMATIN_STATES: Array<{
  id: keyof Variant;
  name: string;
  description: string;
  category: CategoryKey;
}> = [
    { id: "chmm_e1", name: "TssA", description: "Active TSS", category: "promoter" },
    { id: "chmm_e2", name: "PromU", description: "Promoter Upstream TSS", category: "promoter" },
    { id: "chmm_e3", name: "PromD1", description: "Promoter Downstream TSS with DNase", category: "promoter" },
    { id: "chmm_e4", name: "PromD2", description: "Promoter Downstream TSS", category: "promoter" },
    { id: "chmm_e5", name: "Tx5'", description: "Transcription 5'", category: "transcription" },
    { id: "chmm_e6", name: "Tx", description: "Transcription", category: "transcription" },
    { id: "chmm_e7", name: "Tx3'", description: "Transcription 3'", category: "transcription" },
    { id: "chmm_e8", name: "TxWk", description: "Transcription Weak", category: "transcription" },
    { id: "chmm_e9", name: "TxReg", description: "Transcription Regulatory", category: "transcription" },
    { id: "chmm_e10", name: "TxEnh5'", description: "Transcription 5' Enhancer", category: "transcription" },
    { id: "chmm_e11", name: "TxEnh3'", description: "Transcription 3' Enhancer", category: "transcription" },
    { id: "chmm_e12", name: "TxEnhW", description: "Transcription Enhancer Weak", category: "transcription" },
    { id: "chmm_e13", name: "EnhA1", description: "Active Enhancer 1", category: "enhancer" },
    { id: "chmm_e14", name: "EnhA2", description: "Active Enhancer 2", category: "enhancer" },
    { id: "chmm_e15", name: "EnhAF", description: "Active Enhancer Flanking", category: "enhancer" },
    { id: "chmm_e16", name: "EnhW1", description: "Enhancer Weak 1", category: "weak" },
    { id: "chmm_e17", name: "EnhW2", description: "Enhancer Weak 2", category: "weak" },
    { id: "chmm_e18", name: "EnhAc", description: "Enhancer Acetylation Only", category: "weak" },
    { id: "chmm_e19", name: "DNase", description: "DNase Only", category: "other" },
    { id: "chmm_e20", name: "ZNF/Rpts", description: "ZNF Genes and Repeats", category: "other" },
    { id: "chmm_e21", name: "Het", description: "Heterochromatin", category: "heterochromatin" },
    { id: "chmm_e22", name: "PromP", description: "Poised Promoter", category: "repressed" },
    { id: "chmm_e23", name: "PromBiv", description: "Bivalent Promoter", category: "repressed" },
    { id: "chmm_e24", name: "ReprPC", description: "Repressed PolyComb", category: "repressed" },
    { id: "chmm_e25", name: "Quies", description: "Quiescent/Low", category: "quiescent" },
  ];

const CATEGORY_ORDER: CategoryKey[] = [
  "promoter",
  "transcription",
  "enhancer",
  "weak",
  "other",
  "heterochromatin",
  "repressed",
  "quiescent",
];

// Progress bar component
function ChromatinProgressBar({
  value,
  category,
}: {
  value: number;
  category: CategoryKey;
}) {
  const max = 48;
  const percentage = (value / max) * 100;
  const cat = CHROMATIN_CATEGORIES[category];
  const isEmpty = value === 0;

  return (
    <div className="flex items-center gap-2">
      <span className={cn(
        "text-sm font-mono w-12 text-right tabular-nums",
        isEmpty ? "text-muted-foreground/50" : "text-muted-foreground"
      )}>
        {value}/48
      </span>
      <div className={cn("relative h-3 w-32 rounded-full overflow-hidden", isEmpty ? "bg-muted/50" : "bg-muted")}>
        {!isEmpty && (
          <div
            className={cn("absolute inset-y-0 left-0 rounded-full transition-all", cat.barClass)}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
    </div>
  );
}

// Single state row
function ChromatinStateRow({
  state,
  value,
}: {
  state: (typeof CHROMATIN_STATES)[number];
  value: number;
}) {
  const tooltipContent = CHROMATIN_TOOLTIPS[state.id];

  return (
    <div className="flex items-center gap-4 py-2 px-3 hover:bg-muted/50 transition-colors">
      <div className="w-28 flex-shrink-0 flex items-center gap-1">
        <span className="font-medium text-sm">{state.name}</span>
        {tooltipContent && <HeaderTooltip content={tooltipContent} />}
      </div>
      <div className="flex-1 text-sm text-muted-foreground">{state.description}</div>
      <ChromatinProgressBar value={value} category={state.category} />
    </div>
  );
}

// Category group
function ChromatinCategoryGroup({
  categoryKey,
  states,
  data,
}: {
  categoryKey: CategoryKey;
  states: (typeof CHROMATIN_STATES);
  data: Variant;
}) {
  const cat = CHROMATIN_CATEGORIES[categoryKey];

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className={cn("px-3 py-2.5 font-semibold text-sm", BADGE_COLORS[cat.color])}>
        {cat.label}
      </div>
      <div className="divide-y">
        {states.map((state) => (
          <ChromatinStateRow
            key={state.id}
            state={state}
            value={(data[state.id] as number) ?? 0}
          />
        ))}
      </div>
    </div>
  );
}

export function ChromatinStateView({ data }: { data: Variant }) {
  // Group states by category
  const groupedStates = CHROMATIN_STATES.reduce((acc, state) => {
    if (!acc[state.category]) {
      acc[state.category] = [];
    }
    acc[state.category].push(state);
    return acc;
  }, {} as Record<CategoryKey, typeof CHROMATIN_STATES>);

  return (
    <div className="space-y-4">
      {CATEGORY_ORDER.map((categoryKey) => {
        const states = groupedStates[categoryKey];
        if (!states?.length) return null;

        return (
          <ChromatinCategoryGroup
            key={categoryKey}
            categoryKey={categoryKey}
            states={states}
            data={data}
          />
        );
      })}
    </div>
  );
}
