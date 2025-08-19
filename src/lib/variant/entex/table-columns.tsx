"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { MoreHorizontal } from "lucide-react";
import type { Entex } from "@/lib/variant/entex/api";
import { createColumnHeader } from "@/components/ui/data-table-column-header";

export const entexColumns: ColumnDef<Entex>[] = [
  {
    accessorKey: "tissue",
    header: createColumnHeader("Tissue"),
    cell: ({ row }) => {
      const tissue = row.original.tissue;
      if (tissue === "all_tissues") {
        return <span className="text-sm text-muted-foreground">All Tissues</span>;
      }
      const formatted = tissue.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
      return <span className="text-sm">{formatted}</span>;
    },
  },
  {
    id: "allele_counts",
    header: createColumnHeader("Read Counts", {
      tooltip: "Number of reads with each allele (A, C, G, T)",
      sortable: false,
    }),
    cell: ({ row }) => {
      const { ca, cc, cg, ct } = row.original;
      return (
        <div className="grid grid-cols-2 text-xs font-mono">
          <span className="text-blue-600">A:{ca}</span>
          <span className="text-green-600">C:{cc}</span>
          <span className="text-orange-600">G:{cg}</span>
          <span className="text-red-600">T:{ct}</span>
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "ref_allele_ratio",
    header: createColumnHeader("Ref Ratio", {
      tooltip: "Ratio of reads with the reference allele over total reads",
    }),
    cell: ({ row }) => {
      const ratio = Number(row.original.ref_allele_ratio);
      return (
        <div className="space-y-1">
          <div className="text-xs font-mono">{ratio.toFixed(3)}</div>
          <Progress value={ratio * 100} className="h-1 w-16" />
        </div>
      );
    },
  },
  {
    accessorKey: "p_betabinom",
    header: createColumnHeader("P-value", {
      tooltip: "p-value calculated from the beta-binomial test",
      sortable: true,
    }),
    cell: ({ row }) => {
      const pValue = Number(row.original.p_betabinom);
      const colorClass = pValue < 1e-5 ? "text-destructive" : "text-foreground";
      return (
        <span className={`text-sm font-mono ${colorClass}`}>
          {pValue.toExponential(3)}
        </span>
      );
    },
  },
  {
    accessorKey: "imbalance_significance",
    header: createColumnHeader("Significance", {
      tooltip:
        'Indicates if the site passes the FDR10% threshold ("1" for significant, "0" otherwise)',
      sortable: false,
    }),
    cell: ({ row }) => {
      const value = row.original.imbalance_significance;
      const isSignificant = value === 1;
      const text = isSignificant ? "Significant" : "Not Significant";
      const variant = isSignificant ? "default" : "secondary";
      return (
        <Badge variant={variant} className="text-xs">
          {text}
        </Badge>
      );
    },
  },
  {
    id: "details",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const { experiment_accession, hap1_allele, hap2_allele, donor, assay } =
        row.original;
      return (
        <div className="text-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <div className="font-medium">More Details</div>

                <div className="space-y-2">
                  <div>
                    <div className="text-sm font-medium">Alleles:</div>
                    <code className="text-sm bg-muted p-1 rounded">
                      {hap1_allele}/{hap2_allele}
                    </code>
                  </div>

                  <div>
                    <div className="text-sm font-medium">Donor:</div>
                    <span className="text-sm">{donor}</span>
                  </div>

                  <div>
                    <div className="text-sm font-medium">Assay:</div>
                    <span className="text-sm">{assay}</span>
                  </div>

                  <div>
                    <div className="text-sm font-medium">Experiment ID:</div>
                    <code className="text-sm">{experiment_accession}</code>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      );
    },
    enableSorting: false,
    meta: {
      pin: "right",
    },
  },
];

export const entexPooledColumns: ColumnDef<Entex>[] = [
  {
    id: "allele_counts",
    header: createColumnHeader("Read Counts", {
      tooltip: "Number of reads with each allele (A, C, G, T)",
      sortable: false,
    }),
    cell: ({ row }) => {
      const { ca, cc, cg, ct } = row.original;
      return (
        <div className="grid grid-cols-2 text-xs font-mono">
          <span className="text-blue-600">A:{ca}</span>
          <span className="text-green-600">C:{cc}</span>
          <span className="text-orange-600">G:{cg}</span>
          <span className="text-red-600">T:{ct}</span>
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "ref_allele_ratio",
    header: createColumnHeader("Ref Ratio", {
      tooltip: "Ratio of reads with the reference allele over total reads",
    }),
    cell: ({ row }) => {
      const ratio = Number(row.original.ref_allele_ratio);
      return (
        <div className="space-y-1">
          <div className="text-xs font-mono">{ratio.toFixed(3)}</div>
          <Progress value={ratio * 100} className="h-1 w-16" />
        </div>
      );
    },
  },
  {
    accessorKey: "p_betabinom",
    header: createColumnHeader("P-value", {
      tooltip: "p-value calculated from the beta-binomial test",
      sortable: true,
    }),
    cell: ({ row }) => {
      const pValue = Number(row.original.p_betabinom);
      const colorClass = pValue < 1e-5 ? "text-destructive" : "text-foreground";
      return (
        <span className={`text-sm font-mono ${colorClass}`}>
          {pValue.toExponential(3)}
        </span>
      );
    },
  },
  {
    accessorKey: "imbalance_significance",
    header: createColumnHeader("Significance", {
      tooltip:
        'Indicates if the site passes the FDR10% threshold ("1" for significant, "0" otherwise)',
      sortable: false,
    }),
    cell: ({ row }) => {
      const value = row.original.imbalance_significance;
      const isSignificant = value === 1;
      const text = isSignificant ? "Significant" : "Not Significant";
      const variant = isSignificant ? "default" : "secondary";
      return (
        <Badge variant={variant} className="text-xs">
          {text}
        </Badge>
      );
    },
  },
  {
    id: "details",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => {
      const { experiment_accession, hap1_allele, hap2_allele, donor, assay } =
        row.original;
      return (
        <div className="text-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <div className="font-medium">More Details</div>

                <div className="space-y-2">
                  <div>
                    <div className="text-sm font-medium">Alleles:</div>
                    <code className="text-sm bg-muted p-1 rounded">
                      {hap1_allele}/{hap2_allele}
                    </code>
                  </div>

                  <div>
                    <div className="text-sm font-medium">Donor:</div>
                    <span className="text-sm">{donor}</span>
                  </div>

                  <div>
                    <div className="text-sm font-medium">Assay:</div>
                    <span className="text-sm">{assay}</span>
                  </div>

                  <div>
                    <div className="text-sm font-medium">Experiment ID:</div>
                    <code className="text-sm">{experiment_accession}</code>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      );
    },
    enableSorting: false,
    meta: {
      pin: "right",
    },
  },
];