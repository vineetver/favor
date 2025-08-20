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
import { MoreHorizontal, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Entex } from "@/lib/variant/entex/api";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { cn } from "@/lib/utils/general";

const formatTissue = (tissue: string) => {
  if (tissue === "all_tissues") return "All Tissues";
  return tissue
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getImbalanceDirection = (ratio: number) => {
  if (ratio > 0.6) return "ref-biased";
  if (ratio < 0.4) return "alt-biased";
  return "balanced";
};

const getImbalanceStrength = (ratio: number) => {
  const deviation = Math.abs(ratio - 0.5);
  if (deviation < 0.1) return "minimal";
  if (deviation < 0.2) return "moderate";
  if (deviation < 0.3) return "strong";
  return "extreme";
};

const ImbalanceIndicator = ({ ratio }: { ratio: number }) => {
  const direction = getImbalanceDirection(ratio);
  const strength = getImbalanceStrength(ratio);

  const iconMap = {
    "ref-biased": TrendingUp,
    "alt-biased": TrendingDown,
    balanced: Minus,
  };

  const colorMap = {
    "ref-biased": "text-blue-600",
    "alt-biased": "text-orange-600",
    balanced: "text-gray-500",
  };

  const strengthMap = {
    minimal: "opacity-50",
    moderate: "opacity-75",
    strong: "opacity-90",
    extreme: "opacity-100",
  };

  const Icon = iconMap[direction];

  return (
    <div className="flex items-center gap-2">
      <Icon
        className={cn("h-4 w-4", colorMap[direction], strengthMap[strength])}
      />
      <div className="space-y-1">
        <div className="font-mono text-sm font-medium">{ratio.toFixed(3)}</div>
        <Progress
          value={ratio * 100}
          className="h-1.5 w-16"
          indicatorClassName={cn(
            direction === "ref-biased"
              ? "bg-blue-500"
              : direction === "alt-biased"
                ? "bg-orange-500"
                : "bg-gray-400",
          )}
        />
      </div>
    </div>
  );
};

const ReadCountsDisplay = ({
  ca,
  cc,
  cg,
  ct,
}: {
  ca: number;
  cc: number;
  cg: number;
  ct: number;
}) => {
  return (
    <div className="grid grid-cols-2 text-xs font-mono">
      <span className="text-blue-600">A:{ca}</span>
      <span className="text-green-600">C:{cc}</span>
      <span className="text-orange-600">G:{cg}</span>
      <span className="text-red-600">T:{ct}</span>
    </div>
  );
};

const PValueDisplay = ({ pValue }: { pValue: number }) => {
  const colorClass = pValue < 1e-5 ? "text-destructive" : "text-foreground";
  return (
    <span className={`text-sm font-mono ${colorClass}`}>
      {pValue.toExponential(3)}
    </span>
  );
};

export const entexColumns: ColumnDef<Entex>[] = [
  {
    accessorKey: "tissue",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Tissue"
        tooltip="Tissue or cell type where allelic imbalance was measured"
      />
    ),
    cell: ({ row }) => {
      const tissue = row.original.tissue;
      const formatted = formatTissue(tissue);
      return <div className="text-sm font-medium">{formatted}</div>;
    },
  },
  {
    id: "allele_counts",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Read Coverage"
        tooltip="Number of sequencing reads supporting each nucleotide (A, C, G, T)"
        sortable={false}
      />
    ),
    cell: ({ row }) => {
      const { ca, cc, cg, ct } = row.original;
      return <ReadCountsDisplay ca={ca} cc={cc} cg={cg} ct={ct} />;
    },
    enableSorting: false,
  },
  {
    accessorKey: "ref_allele_ratio",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Allelic Balance"
        tooltip="Reference allele ratio: 0.5 = balanced, >0.5 = ref-biased, <0.5 = alt-biased"
        sortable={true}
      />
    ),
    cell: ({ row }) => {
      const ratio = Number(row.original.ref_allele_ratio);
      return <ImbalanceIndicator ratio={ratio} />;
    },
  },
  {
    accessorKey: "p_betabinom",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="P-value"
        tooltip="p-value calculated from the beta-binomial test"
        sortable={true}
      />
    ),
    cell: ({ row }) => {
      const pValue = Number(row.original.p_betabinom);
      return <PValueDisplay pValue={pValue} />;
    },
  },
  {
    accessorKey: "imbalance_significance",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Significance"
        tooltip='Indicates if the site passes the FDR10% threshold ("1" for significant, "0" otherwise)'
        sortable={false}
      />
    ),
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
              <div className="space-y-4">
                <div className="font-semibold text-base border-b pb-2">
                  Experiment Details
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Genotype
                    </div>
                    <code className="text-base font-mono">
                      {hap1_allele}/{hap2_allele}
                    </code>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Donor ID
                      </div>
                      <span className="text-sm font-mono">{donor}</span>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Assay Type
                      </div>
                      <span className="text-sm">{assay}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Experiment Accession
                    </div>
                    <code className="text-xs font-mono">
                      {experiment_accession}
                    </code>
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
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Read Coverage"
        tooltip="Pooled sequencing reads across all tissues (A, C, G, T)"
        sortable={false}
      />
    ),
    cell: ({ row }) => {
      const { ca, cc, cg, ct } = row.original;
      return <ReadCountsDisplay ca={ca} cc={cc} cg={cg} ct={ct} />;
    },
    enableSorting: false,
  },
  {
    accessorKey: "ref_allele_ratio",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Allelic Balance"
        tooltip="Cross-tissue reference allele ratio: 0.5 = balanced, >0.5 = ref-biased, <0.5 = alt-biased"
        sortable={true}
      />
    ),
    cell: ({ row }) => {
      const ratio = Number(row.original.ref_allele_ratio);
      return <ImbalanceIndicator ratio={ratio} />;
    },
  },
  {
    accessorKey: "p_betabinom",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="P-value"
        tooltip="p-value calculated from the beta-binomial test"
        sortable={true}
      />
    ),
    cell: ({ row }) => {
      const pValue = Number(row.original.p_betabinom);
      return <PValueDisplay pValue={pValue} />;
    },
  },
  {
    accessorKey: "imbalance_significance",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Significance"
        tooltip='Indicates if the site passes the FDR10% threshold ("1" for significant, "0" otherwise)'
        sortable={false}
      />
    ),
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
              <div className="space-y-4">
                <div className="font-semibold text-base border-b pb-2">
                  Pooled Analysis Details
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Genotype
                    </div>
                    <code className="text-base font-mono">
                      {hap1_allele}/{hap2_allele}
                    </code>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Donor ID
                      </div>
                      <span className="text-sm font-mono">{donor}</span>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-muted-foreground">
                        Assay Type
                      </div>
                      <span className="text-sm">{assay}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Experiment Accession
                    </div>
                    <code className="text-xs font-mono">
                      {experiment_accession}
                    </code>
                  </div>

                  <div className="text-xs text-muted-foreground italic">
                    * Data aggregated across all tissue types
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
