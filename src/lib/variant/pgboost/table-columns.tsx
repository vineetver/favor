"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { Progress } from "@/components/ui/progress";
import type { PGBoost } from "@/lib/variant/pgboost/types";

const formatPGBoostScore = (num: number | null | undefined) => {
  if (num == null || num === -1 || num === 1e-100) return "N/A";
  return num.toFixed(num < 0.01 ? 6 : 4);
};

export const pgboostColumns: ColumnDef<PGBoost>[] = [
  {
    accessorKey: "gene",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Variant-gene link predictions"
        sortable={true}
      />
    ),
    cell: ({ row }) => {
      const gene = row.original?.gene;
      if (!gene)
        return <div className="text-left text-muted-foreground">N/A</div>;

      return (
        <div className="text-left">
          <Link
            href={`/hg38/gene/${gene}/gene-level-annotation/info-and-ids`}
            className="text-primary underline hover:text-primary/80 transition-colors font-medium"
          >
            {gene}
          </Link>
        </div>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: "pg_boost",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="pgBoost"
        className="justify-center"
        sortable={true}
        tooltip={
          <div className="text-sm">
            pgBoost (Dorans et al. medRxiv) is a gradient boosting model that
            trains a non-linear combination of existing single-cell ATAC
            peak-gene linking scores (SCENT, Signac, Cicero) and SNP-gene
            distance on fine-mapped eSNP-eGene pairs from GTEx to assign a
            probabilistic score to each candidate SNP-gene link.
          </div>
        }
      />
    ),
    cell: ({ row }) => {
      const num = row.original?.pg_boost;
      return (
        <div className="text-left font-mono">{formatPGBoostScore(num)}</div>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: "pg_boost_percentile",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="pgBoost Percentile"
        className="justify-center"
        sortable={true}
        tooltip={
          <div className="text-sm">
            Percentile score of the methods pgBoost. Higher percentiles indicate
            stronger variant-gene associations.
          </div>
        }
      />
    ),
    cell: ({ row }) => {
      const val = row.original?.pg_boost_percentile;
      if (val == null) return <div className="text-left">N/A</div>;

      const percentage = val * 100;
      return (
        <div className="flex items-center justify-start space-x-2">
          <Progress
            value={percentage}
            className="h-2 w-16"
            style={{
              backgroundColor: "#e5e7eb",
            }}
          />
          <span className="font-mono text-sm">{percentage.toFixed(1)}%</span>
        </div>
      );
    },
    enableSorting: true,
    sortingFn: "auto",
  },
  {
    accessorKey: "scent",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="SCENT"
        className="justify-center"
        sortable={true}
      />
    ),
    cell: ({ row }) => (
      <div className="text-left font-mono">
        {formatPGBoostScore(row.original?.scent)}
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "signac",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Signac"
        className="justify-center"
        sortable={true}
      />
    ),
    cell: ({ row }) => (
      <div className="text-left font-mono">
        {formatPGBoostScore(row.original?.signac)}
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "cicero",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Cicero"
        className="justify-center"
        sortable={true}
      />
    ),
    cell: ({ row }) => (
      <div className="text-left font-mono">
        {formatPGBoostScore(row.original?.cicero)}
      </div>
    ),
    enableSorting: true,
  },
];
