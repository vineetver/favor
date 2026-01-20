"use client";

import { Info } from "lucide-react";
import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Variant } from "@/features/variant/types";
import {
  BADGE_COLORS,
  type BadgeColor,
  type ColumnMeta,
} from "@/lib/table/column-builder";
import { cn } from "@/lib/utils";
import { chromatinStateColumns } from "../config/hg38/columns/chromatin-state";

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

// HeaderTooltip matching the style of DataTable
function HeaderTooltip({ content }: { content: ReactNode }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-4 w-4 cursor-help flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-md">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Chromatin state categories using badge colors
const CHROMATIN_CATEGORIES: Record<
  string,
  {
    label: string;
    color: BadgeColor;
    barClass: string;
    description: string;
  }
> = {
  promoter: {
    label: "Promoter",
    color: "red",
    barClass: "bg-red-400",
    description:
      "Regions associated with transcription start sites and gene promoters",
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
    description:
      "Other regulatory elements including DNase-only and repeat regions",
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
    barClass: "bg-slate-400",
    description: "Inactive regions with low signal across all marks",
  },
};

type CategoryKey = keyof typeof CHROMATIN_CATEGORIES;

// Chromatin state definitions
const CHROMATIN_STATES: Array<{
  id: string;
  name: string;
  description: string;
  category: CategoryKey;
  accessor: (data: Variant) => number | null | undefined;
}> = [
  {
    id: "chmm_e1",
    name: "TssA",
    description: "Active TSS",
    category: "promoter",
    accessor: (data) => data.main?.chromhmm?.e1,
  },
  {
    id: "chmm_e2",
    name: "PromU",
    description: "Promoter Upstream TSS",
    category: "promoter",
    accessor: (data) => data.main?.chromhmm?.e2,
  },
  {
    id: "chmm_e3",
    name: "PromD1",
    description: "Promoter Downstream TSS with DNase",
    category: "promoter",
    accessor: (data) => data.main?.chromhmm?.e3,
  },
  {
    id: "chmm_e4",
    name: "PromD2",
    description: "Promoter Downstream TSS",
    category: "promoter",
    accessor: (data) => data.main?.chromhmm?.e4,
  },
  {
    id: "chmm_e5",
    name: "Tx5'",
    description: "Transcription 5'",
    category: "transcription",
    accessor: (data) => data.main?.chromhmm?.e5,
  },
  {
    id: "chmm_e6",
    name: "Tx",
    description: "Transcription",
    category: "transcription",
    accessor: (data) => data.main?.chromhmm?.e6,
  },
  {
    id: "chmm_e7",
    name: "Tx3'",
    description: "Transcription 3'",
    category: "transcription",
    accessor: (data) => data.main?.chromhmm?.e7,
  },
  {
    id: "chmm_e8",
    name: "TxWk",
    description: "Transcription Weak",
    category: "transcription",
    accessor: (data) => data.main?.chromhmm?.e8,
  },
  {
    id: "chmm_e9",
    name: "TxReg",
    description: "Transcription Regulatory",
    category: "transcription",
    accessor: (data) => data.main?.chromhmm?.e9,
  },
  {
    id: "chmm_e10",
    name: "TxEnh5'",
    description: "Transcription 5' Enhancer",
    category: "transcription",
    accessor: (data) => data.main?.chromhmm?.e10,
  },
  {
    id: "chmm_e11",
    name: "TxEnh3'",
    description: "Transcription 3' Enhancer",
    category: "transcription",
    accessor: (data) => data.main?.chromhmm?.e11,
  },
  {
    id: "chmm_e12",
    name: "TxEnhW",
    description: "Transcription Enhancer Weak",
    category: "transcription",
    accessor: (data) => data.main?.chromhmm?.e12,
  },
  {
    id: "chmm_e13",
    name: "EnhA1",
    description: "Active Enhancer 1",
    category: "enhancer",
    accessor: (data) => data.main?.chromhmm?.e13,
  },
  {
    id: "chmm_e14",
    name: "EnhA2",
    description: "Active Enhancer 2",
    category: "enhancer",
    accessor: (data) => data.main?.chromhmm?.e14,
  },
  {
    id: "chmm_e15",
    name: "EnhAF",
    description: "Active Enhancer Flanking",
    category: "enhancer",
    accessor: (data) => data.main?.chromhmm?.e15,
  },
  {
    id: "chmm_e16",
    name: "EnhW1",
    description: "Enhancer Weak 1",
    category: "weak",
    accessor: (data) => data.main?.chromhmm?.e16,
  },
  {
    id: "chmm_e17",
    name: "EnhW2",
    description: "Enhancer Weak 2",
    category: "weak",
    accessor: (data) => data.main?.chromhmm?.e17,
  },
  {
    id: "chmm_e18",
    name: "EnhAc",
    description: "Enhancer Acetylation Only",
    category: "weak",
    accessor: (data) => data.main?.chromhmm?.e18,
  },
  {
    id: "chmm_e19",
    name: "DNase",
    description: "DNase Only",
    category: "other",
    accessor: (data) => data.main?.chromhmm?.e19,
  },
  {
    id: "chmm_e20",
    name: "ZNF/Rpts",
    description: "ZNF Genes and Repeats",
    category: "other",
    accessor: (data) => data.main?.chromhmm?.e20,
  },
  {
    id: "chmm_e21",
    name: "Het",
    description: "Heterochromatin",
    category: "heterochromatin",
    accessor: (data) => data.main?.chromhmm?.e21,
  },
  {
    id: "chmm_e22",
    name: "PromP",
    description: "Poised Promoter",
    category: "repressed",
    accessor: (data) => data.main?.chromhmm?.e22,
  },
  {
    id: "chmm_e23",
    name: "PromBiv",
    description: "Bivalent Promoter",
    category: "repressed",
    accessor: (data) => data.main?.chromhmm?.e23,
  },
  {
    id: "chmm_e24",
    name: "ReprPC",
    description: "Repressed PolyComb",
    category: "repressed",
    accessor: (data) => data.main?.chromhmm?.e24,
  },
  {
    id: "chmm_e25",
    name: "Quies",
    description: "Quiescent/Low",
    category: "quiescent",
    accessor: (data) => data.main?.chromhmm?.e25,
  },
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
      <span
        className={cn(
          "text-data w-12 text-right tabular-nums",
          isEmpty ? "!text-slate-300" : "",
        )}
      >
        {value}/48
      </span>
      <div
        className={cn(
          "relative h-3 w-32 rounded-full overflow-hidden",
          isEmpty ? "bg-slate-100" : "bg-slate-200",
        )}
      >
        {!isEmpty && (
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-all",
              cat.barClass,
            )}
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
    <div className="flex items-center gap-4 py-3 px-4 hover:bg-slate-50/50 transition-colors">
      <div className="w-28 flex-shrink-0 flex items-center gap-1.5">
        <span className="font-semibold text-base text-slate-900">
          {state.name}
        </span>
        {tooltipContent && <HeaderTooltip content={tooltipContent} />}
      </div>
      <div className="flex-1 text-base text-slate-500">{state.description}</div>
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
  states: typeof CHROMATIN_STATES;
  data: Variant;
}) {
  const cat = CHROMATIN_CATEGORIES[categoryKey];

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className={cn("px-4 py-3 text-label", BADGE_COLORS[cat.color])}>
        {cat.label}
      </div>
      <div className="divide-y divide-slate-200 bg-white">
        {states.map((state) => (
          <ChromatinStateRow
            key={state.id}
            state={state}
            value={state.accessor(data) ?? 0}
          />
        ))}
      </div>
    </div>
  );
}

export function ChromatinStateView({ data }: { data: Variant }) {
  // Group states by category
  const groupedStates = CHROMATIN_STATES.reduce(
    (acc, state) => {
      if (!acc[state.category]) {
        acc[state.category] = [];
      }
      acc[state.category].push(state);
      return acc;
    },
    {} as Record<CategoryKey, typeof CHROMATIN_STATES>,
  );

  return (
    <Card>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  );
}
