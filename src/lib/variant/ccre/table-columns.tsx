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
    header: createColumnHeader("Regulatory Element", {
      tooltip: "ENCODE cCRE accession identifier"
    }),
    accessorKey: "accession",
    cell: ({ row }) => (
      <div className="font-mono text-sm">
        {row.original.accession}
      </div>
    ),
  },
  {
    header: createColumnHeader("Functional Class", {
      tooltip: "Predicted regulatory function based on chromatin signatures"
    }),
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
    header: createColumnHeader("Genomic Location", {
      tooltip: "Chromosome coordinates (GRCh38/hg38)"
    }),
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

export const tissueColumns: ColumnDef<CCRETissue>[] = [
  {
    header: createColumnHeader("Accession"),
    accessorKey: "accession",
    cell: ({ row }) => {
      const formatted = row.original.accession;
      return formatted;
    },
  },
  {
    header: createColumnHeader("Region"),
    accessorKey: "score",
    cell: ({ row }) => {
      const chrom = row.original.chromosome;
      const start = row.original.start_position;
      const end = row.original.end_position;
      const region = `${chrom}-${start}-${end}`;
      return (
        <div className="min-w-0">
          <ExternalLink
            href={`https://favor.genohub.org/hg38/region/${region}/SNV-summary/allele-distribution`}
            className="text-sm truncate"
          >
            {region}
          </ExternalLink>
        </div>
      );
    },
  },
  {
    header: createColumnHeader("Class"),
    accessorKey: "datatype",
    cell: ({ row }) => {
      const formatted = row.original.datatype;
      return formatted;
    },
  },
  {
    header: createColumnHeader("Chromatin Accessibility"),
    id: "accessibility",
    cell: ({ row }) => (
      <div className="space-y-1 text-xs">
        <div>
          <span className="font-medium">DNase:</span>{" "}
          {row.original.dnase || "N/A"}
        </div>
        <div>
          <span className="font-medium">ATAC:</span>{" "}
          {row.original.atac || "N/A"}
        </div>
      </div>
    ),
  },
  {
    header: createColumnHeader("Histone Marks"),
    id: "histones",
    cell: ({ row }) => (
      <div className="space-y-1 text-xs">
        <div>
          <span className="font-medium">H3K27ac:</span>{" "}
          {row.original.h3k27ac || "N/A"}
        </div>
        <div>
          <span className="font-medium">H3K4me3:</span>{" "}
          {row.original.h3k4me3 || "N/A"}
        </div>
      </div>
    ),
  },
  {
    header: createColumnHeader("CTCF"),
    accessorKey: "ctcf",
    cell: ({ row }) => row.original.ctcf || "N/A",
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