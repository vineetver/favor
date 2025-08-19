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
    header: createColumnHeader("Accession", {
      tooltip: "cCRE identifier",
    }),
    accessorKey: "accession",
    cell: ({ row }) => {
      const formatted = row.original.accession;
      return formatted;
    },
  },
  {
    header: createColumnHeader("Annotations", {
      tooltip: "Functional annotations for this cCRE",
    }),
    accessorKey: "annotations",
    cell: ({ row }) => {
      const formatted = row.original.annotations;
      return (
        <div className="normal-case cursor-pointer">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-2">
                  {ccreAnnotationCCode(formatted, formatted)}
                  <span className="text-sm text-muted-foreground">
                    {ccreAnnotationMap[formatted] || formatted}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{formatted}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      );
    },
  },
  {
    header: createColumnHeader("cCRE Region", {
      tooltip: "Genomic coordinates of the cCRE",
    }),
    accessorKey: "chromosome",
    cell: ({ row }) => {
      const chrom = row.original.chromosome;
      const start = row.original.start_position;
      const end = row.original.end_position;
      const region = `${chrom}-${start}-${end}`;
      return (
        <div className="min-w-0">
          <ExternalLink
            href={`https://favor.genohub.org/hg38/region/${region}/SNV-summary/allele-distribution`}
            className="text-sm font-mono truncate"
          >
            {region}
          </ExternalLink>
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
            "inline-flex items-center w-full cursor-pointer rounded-md px-3 py-2 transition-colors",
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
    header: createColumnHeader("Accession", {
      tooltip: "cCRE identifier",
    }),
    accessorKey: "accession",
    cell: ({ row }) => {
      const formatted = row.original.accession;
      return formatted;
    },
  },
  {
    header: createColumnHeader("Region", {
      tooltip: "Genomic coordinates of the cCRE",
    }),
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
    header: createColumnHeader("Class", {
      tooltip: "cCRE classification type",
    }),
    accessorKey: "datatype",
    cell: ({ row }) => {
      const formatted = row.original.datatype;
      return formatted;
    },
  },
  {
    header: createColumnHeader("Chromatin Accessibility", {
      tooltip: "DNase and ATAC-seq signals",
    }),
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
    header: createColumnHeader("Histone Marks", {
      tooltip: "H3K27ac and H3K4me3 histone modification signals",
    }),
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
    header: createColumnHeader("CTCF", {
      tooltip: "CTCF binding signal",
    }),
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
            "inline-flex items-center w-full cursor-pointer rounded-md px-3 py-2 transition-colors",
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