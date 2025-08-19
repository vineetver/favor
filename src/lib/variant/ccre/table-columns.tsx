"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ChevronDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ExternalLink } from "@/components/ui/external-link";
import {
  ccreAnnotationMap,
} from "@/lib/variant/ccre/annotations";
import { ccreAnnotationCCode } from "@/lib/utils/colors";
import type { CCRE, CCRETissue } from "@/lib/variant/ccre/types";
import { cn } from "@/lib/utils/general";
import { createColumnHeader } from "@/components/ui/data-table-column-header";

export const ccreColumns: ColumnDef<CCRE>[] = [
  {
    header: createColumnHeader("Regulatory Element"),
    accessorKey: "accession",
    cell: ({ row }) => (
      <div className="font-mono text-sm">
        {row.original.accession}
      </div>
    ),
  },
  {
    header: createColumnHeader("Functional Class"),
    accessorKey: "annotations",
    cell: ({ row }) => {
      const annotation = row.original.annotations;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 cursor-help">
                {ccreAnnotationCCode(annotation, annotation)}
                <span className="text-sm font-medium">
                  {ccreAnnotationMap[annotation] || annotation}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <div className="space-y-1">
                <div className="font-semibold">{ccreAnnotationMap[annotation]}</div>
                <div className="text-xs text-muted-foreground">
                  {annotation === "PLS" && "Active promoter-like signatures"}
                  {annotation === "pELS" && "Proximal enhancer-like signatures"}
                  {annotation === "dELS" && "Distal enhancer-like signatures"}
                  {annotation === "DNase-H3K4me3" && "Promoter chromatin accessibility"}
                  {annotation === "CTCF-only" && "Insulator/boundary elements"}
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    header: createColumnHeader("Genomic Location"),
    accessorKey: "chromosome",
    cell: ({ row }) => {
      const chrom = row.original.chromosome;
      const start = row.original.start_position.toLocaleString();
      const end = row.original.end_position.toLocaleString();
      const size = ((row.original.end_position - row.original.start_position) / 1000).toFixed(1);
      const region = `${chrom}-${row.original.start_position}-${row.original.end_position}`;
      
      return (
        <div className="space-y-1">
          <ExternalLink
            href={`https://favor.genohub.org/hg38/region/${region}/SNV-summary/allele-distribution`}
            className="font-mono text-sm font-medium hover:text-primary"
          >
            {chrom}:{start}-{end}
          </ExternalLink>
          <div className="text-xs text-muted-foreground">
            {size} kb region
          </div>
        </div>
      );
    },
  },
  {
    header: createColumnHeader("Linked Genes", {
      tooltip:
        "Click to explore functional links: eQTL, ChIA-PET, Hi-C, CRISPR data",
      sortable: false,
    }),
    id: "gene-links",
    meta: {
      pin: "right",
    },
    cell: ({ row }) => {
      const isExpanded = row.getIsExpanded();

      return (
        <div
          onClick={row.getToggleExpandedHandler()}
          aria-expanded={isExpanded}
          aria-controls={`expanded-content-${row.id}`}
          className={cn(
            "inline-flex items-center w-full cursor-pointer rounded-md px-3 py-2 transition-colors border-l-2 border-l-border",
            "hover:bg-muted/50 border border-border/50 hover:border-border",
            isExpanded && "bg-primary/10 border-primary/30",
          )}
        >
          <div className="flex items-center justify-between w-full">
            <span
              className={cn(
                "text-sm font-medium",
                isExpanded ? "text-primary" : "text-foreground",
              )}
            >
              {isExpanded ? "Hide Links" : "Show Links"}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200 ml-2",
                isExpanded
                  ? "rotate-180 text-primary"
                  : "text-muted-foreground",
              )}
            />
          </div>
        </div>
      );
    },
    enableSorting: false,
  },
];

const formatSignalValue = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "—";
  if (value === 0) return "0";
  return value.toFixed(2);
};

const getSignalStrength = (value: number | null | undefined) => {
  if (value === null || value === undefined || value === 0) return "none";
  if (value < 1) return "weak";
  if (value < 5) return "moderate";
  if (value < 10) return "strong";
  return "very-strong";
};

const SignalIndicator = ({ value, label }: { value: number | null | undefined, label: string }) => {
  const strength = getSignalStrength(value);
  const colorMap = {
    "none": "bg-gray-100 text-gray-400",
    "weak": "bg-yellow-100 text-yellow-700",
    "moderate": "bg-orange-100 text-orange-700", 
    "strong": "bg-red-100 text-red-700",
    "very-strong": "bg-red-200 text-red-800"
  };

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className={cn(
        "px-2 py-0.5 rounded-full text-xs font-medium min-w-[3rem] text-center",
        colorMap[strength]
      )}>
        {formatSignalValue(value)}
      </div>
    </div>
  );
};

export const tissueColumns: ColumnDef<CCRETissue>[] = [
  {
    header: createColumnHeader("Regulatory Element"),
    accessorKey: "accession",
    cell: ({ row }) => (
      <div className="font-mono text-sm">
        {row.original.accession}
      </div>
    ),
  },
  {
    header: createColumnHeader("Genomic Location"),
    accessorKey: "chromosome",
    cell: ({ row }) => {
      const chrom = row.original.chromosome;
      const start = row.original.start_position.toLocaleString();
      const end = row.original.end_position.toLocaleString();
      const size = ((row.original.end_position - row.original.start_position) / 1000).toFixed(1);
      const region = `${chrom}-${row.original.start_position}-${row.original.end_position}`;
      
      return (
        <div className="space-y-1">
          <ExternalLink
            href={`https://favor.genohub.org/hg38/region/${region}/SNV-summary/allele-distribution`}
            className="font-mono text-sm font-medium hover:text-primary"
          >
            {chrom}:{start}-{end}
          </ExternalLink>
          <div className="text-xs text-muted-foreground">
            {size} kb
          </div>
        </div>
      );
    },
  },
  {
    header: createColumnHeader("Element Type"),
    accessorKey: "datatype",
    cell: ({ row }) => {
      const type = row.original.datatype;
      const typeMap = {
        "Promoter": "🎯 Promoter",
        "Enhancer": "⚡ Enhancer", 
        "Insulator": "🛡️ Insulator",
        "Silencer": "🔽 Silencer"
      };
      
      return (
        <div className="text-sm font-medium">
          {typeMap[type as keyof typeof typeMap] || type}
        </div>
      );
    },
  },
  {
    header: createColumnHeader("Chromatin Accessibility"),
    id: "accessibility",
    cell: ({ row }) => (
      <div className="space-y-2 min-w-[120px]">
        <SignalIndicator value={row.original.dnase} label="DNase" />
        <SignalIndicator value={row.original.atac} label="ATAC" />
      </div>
    ),
  },
  {
    header: createColumnHeader("Histone Modifications"),
    id: "histones",
    cell: ({ row }) => (
      <div className="space-y-2 min-w-[130px]">
        <SignalIndicator value={row.original.h3k27ac} label="H3K27ac" />
        <SignalIndicator value={row.original.h3k4me3} label="H3K4me3" />
      </div>
    ),
  },
  {
    header: createColumnHeader("CTCF Binding"),
    accessorKey: "ctcf",
    cell: ({ row }) => {
      const ctcf = row.original.ctcf;
      const strength = getSignalStrength(ctcf);
      const colorMap = {
        "none": "text-gray-400",
        "weak": "text-blue-500",
        "moderate": "text-blue-600", 
        "strong": "text-blue-700",
        "very-strong": "text-blue-800"
      };
      
      return (
        <div className={cn("font-mono font-semibold", colorMap[strength])}>
          {formatSignalValue(ctcf)}
        </div>
      );
    },
  },
  {
    header: createColumnHeader("Linked Genes", {
      tooltip:
        "Click to explore functional links: eQTL, ChIA-PET, Hi-C, CRISPR data",
      sortable: false,
    }),
    id: "gene-links",
    meta: {
      pin: "right",
    },
    cell: ({ row }) => {
      const isExpanded = row.getIsExpanded();

      return (
        <div
          onClick={row.getToggleExpandedHandler()}
          aria-expanded={isExpanded}
          aria-controls={`expanded-content-${row.id}`}
          className={cn(
            "inline-flex items-center w-full cursor-pointer rounded-md px-3 py-2 transition-colors border-l-2 border-l-border",
            "hover:bg-muted/50 border border-border/50 hover:border-border",
            isExpanded && "bg-primary/10 border-primary/30",
          )}
        >
          <div className="flex items-center justify-between w-full">
            <span
              className={cn(
                "text-sm font-medium",
                isExpanded ? "text-primary" : "text-foreground",
              )}
            >
              {isExpanded ? "Hide Links" : "Show Links"}
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200 ml-2",
                isExpanded
                  ? "rotate-180 text-primary"
                  : "text-muted-foreground",
              )}
            />
          </div>
        </div>
      );
    },
    enableSorting: false,
  },
];