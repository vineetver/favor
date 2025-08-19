"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { createColumnHeader } from "@/components/ui/data-table-column-header";
import type { Eqtl, Crispr, Chiapet } from "@/components/features/ccre/linked-genes/types";

export const eqtlColumns: ColumnDef<Eqtl>[] = [
  {
    header: createColumnHeader("Gene", {
      tooltip: "Gene symbol",
    }),
    accessorKey: "gene_name",
    cell: ({ row }) => (
      <span className="font-medium text-xs">{row.original.gene_name}</span>
    ),
  },
  {
    header: createColumnHeader("Type", {
      tooltip: "Gene type",
    }),
    accessorKey: "gene_type",
    cell: ({ row }) => (
      <Badge variant="secondary" className="text-xs">
        {row.original.gene_type}
      </Badge>
    ),
  },
  {
    header: createColumnHeader("P-value", {
      tooltip: "Statistical significance",
    }),
    accessorKey: "p_value",
    cell: ({ row }) => (
      <Badge
        variant={row.original.p_value < 1e-5 ? "default" : "outline"}
        className="text-xs"
      >
        {row.original.p_value.toExponential(1)}
      </Badge>
    ),
  },
  {
    header: createColumnHeader("Tissue", {
      tooltip: "Tissue or cell type",
    }),
    accessorKey: "tissue",
    cell: ({ row }) => (
      <div className="max-w-32 truncate text-xs" title={row.original.tissue}>
        {row.original.tissue}
      </div>
    ),
  },
  {
    header: createColumnHeader("Effect", {
      tooltip: "Effect size (slope)",
    }),
    accessorKey: "slope",
    cell: ({ row }) => (
      <span className="text-xs">{row.original.slope.toFixed(3)}</span>
    ),
  },
  {
    header: createColumnHeader("Source", {
      tooltip: "Data source",
    }),
    accessorKey: "source",
    cell: ({ row }) => (
      <span className="text-xs">{row.original.source}</span>
    ),
  },
];

export const crisprColumns: ColumnDef<Crispr>[] = [
  {
    header: createColumnHeader("Gene", {
      tooltip: "Gene symbol",
    }),
    accessorKey: "gene_name",
    cell: ({ row }) => (
      <span className="font-medium text-xs">{row.original.gene_name}</span>
    ),
  },
  {
    header: createColumnHeader("Type", {
      tooltip: "Gene type",
    }),
    accessorKey: "gene_type",
    cell: ({ row }) => (
      <Badge variant="secondary" className="text-xs">
        {row.original.gene_type}
      </Badge>
    ),
  },
  {
    header: createColumnHeader("P-value", {
      tooltip: "Statistical significance",
    }),
    accessorKey: "p_value",
    cell: ({ row }) => (
      <Badge
        variant={row.original.p_value < 1e-4 ? "default" : "outline"}
        className="text-xs"
      >
        {row.original.p_value.toExponential(1)}
      </Badge>
    ),
  },
  {
    header: createColumnHeader("Assay", {
      tooltip: "Assay type",
    }),
    accessorKey: "assay_type",
    cell: ({ row }) => (
      <div
        className="max-w-24 truncate text-xs"
        title={row.original.assay_type}
      >
        {row.original.assay_type}
      </div>
    ),
  },
  {
    header: createColumnHeader("Biosample", {
      tooltip: "Biological sample",
    }),
    accessorKey: "biosample",
    cell: ({ row }) => (
      <div className="max-w-32 truncate text-xs" title={row.original.biosample}>
        {row.original.biosample}
      </div>
    ),
  },
  {
    header: createColumnHeader("Effect", {
      tooltip: "Effect size",
    }),
    accessorKey: "effect_size",
    cell: ({ row }) => (
      <span className="text-xs">{row.original.effect_size}</span>
    ),
  },
  {
    header: createColumnHeader("gRNA", {
      tooltip: "Guide RNA identifier",
    }),
    accessorKey: "grna_id",
    cell: ({ row }) => (
      <span className="text-xs">{row.original.grna_id}</span>
    ),
  },
];

export const chiapetColumns: ColumnDef<Chiapet>[] = [
  {
    header: createColumnHeader("Gene", {
      tooltip: "Gene symbol",
    }),
    accessorKey: "gene_name",
    cell: ({ row }) => (
      <span className="font-medium text-xs">{row.original.gene_name}</span>
    ),
  },
  {
    header: createColumnHeader("Type", {
      tooltip: "Gene type",
    }),
    accessorKey: "gene_type",
    cell: ({ row }) => (
      <Badge variant="secondary" className="text-xs">
        {row.original.gene_type}
      </Badge>
    ),
  },
  {
    header: createColumnHeader("Score", {
      tooltip: "Interaction score",
    }),
    accessorKey: "score",
    cell: ({ row }) => {
      const score = parseFloat(row.original.score) || 0;
      return (
        <Badge
          variant={score > 20 ? "default" : "outline"}
          className="text-xs"
        >
          {score.toFixed(1)}
        </Badge>
      );
    },
  },
  {
    header: createColumnHeader("Biosample", {
      tooltip: "Biological sample",
    }),
    accessorKey: "biosample",
    cell: ({ row }) => (
      <div className="max-w-32 truncate text-xs" title={row.original.biosample}>
        {row.original.biosample}
      </div>
    ),
  },
  {
    header: createColumnHeader("P-value", {
      tooltip: "Statistical significance",
    }),
    accessorKey: "p_value",
    cell: ({ row }) => (
      <span className="text-xs">{row.original.p_value}</span>
    ),
  },
  {
    header: createColumnHeader("Experiment", {
      tooltip: "Experiment identifier",
    }),
    accessorKey: "experiment_id",
    cell: ({ row }) => (
      <span className="text-xs">{row.original.experiment_id}</span>
    ),
  },
];