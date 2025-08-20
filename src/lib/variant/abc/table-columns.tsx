"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "@/components/ui/external-link";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import type { ABCPeaks, ABCScore } from "@/lib/variant/abc/api";

const formatRegion = (chromosome: string, start: number, end: number) => {
  return `${chromosome}-${start.toLocaleString()}-${end.toLocaleString()}`;
};

const formatRegionLink = (chromosome: string, start: number, end: number) => {
  const region = `${chromosome}-${start}-${end}`;
  return `/hg38/region/${region}/SNV-summary/allele-distribution`;
};

export const abcPeaksColumns: ColumnDef<ABCPeaks>[] = [
  {
    id: "region",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Region" />
    ),
    cell: ({ row }) => {
      const { chromosome, start_position, end_position } = row.original;
      const regionStr = formatRegion(chromosome, start_position, end_position);
      const href = formatRegionLink(chromosome, start_position, end_position);
      
      return (
        <ExternalLink href={href} className="font-mono text-sm" iconSize="sm">
          {regionStr}
        </ExternalLink>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "signal_value",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Signal Value" />
    ),
    cell: ({ row }) => (
      <span className="font-mono">
        {row.getValue<number>("signal_value").toFixed(3)}
      </span>
    ),
  },
  {
    accessorKey: "p_value",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="P-value" />
    ),
    cell: ({ row }) => {
      const pValue = row.getValue<number>("p_value");
      return (
        <span className="font-mono text-sm">
          {pValue < 0.001 ? pValue.toExponential(2) : pValue.toFixed(4)}
        </span>
      );
    },
  },
  {
    accessorKey: "q_value",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Q-value" />
    ),
    cell: ({ row }) => {
      const qValue = row.getValue<number>("q_value");
      return (
        <span className="font-mono text-sm">
          {qValue < 0.001 ? qValue.toExponential(2) : qValue.toFixed(4)}
        </span>
      );
    },
  },
  {
    accessorKey: "peak",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Peak" />
    ),
    cell: ({ row }) => (
      <span className="font-mono">{row.getValue<number>("peak")}</span>
    ),
  },
  {
    accessorKey: "tissue",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tissue" />
    ),
    cell: ({ row }) => (
      <Badge variant="secondary" className="capitalize">
        {row.getValue<string>("tissue")}
      </Badge>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
];

export const abcScoreColumns: ColumnDef<ABCScore>[] = [
  {
    id: "relationship",
    header: "ABC Relationship",
    cell: ({ row }) => {
      const { gene_name, chromosome, start_position, end_position, promotor_chromosome, promotor_start_position, promotor_end_position } = row.original;
      const enhancerRegion = formatRegion(chromosome, start_position, end_position);
      const promoterRegion = formatRegion(promotor_chromosome, promotor_start_position, promotor_end_position);
      
      return (
        <div className="space-y-1">
          <div className="font-medium text-sm">{gene_name}</div>
          <div className="text-xs text-muted-foreground">
            <ExternalLink 
              href={formatRegionLink(chromosome, start_position, end_position)}
              className="font-mono hover:text-primary text-xs"
              iconSize="sm"
            >
              {enhancerRegion}
            </ExternalLink>
            <span className="mx-1">→</span>
            <ExternalLink 
              href={formatRegionLink(promotor_chromosome, promotor_start_position, promotor_end_position)}
              className="font-mono hover:text-primary text-xs"
              iconSize="sm"
            >
              {promoterRegion}
            </ExternalLink>
          </div>
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "abc_score",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="ABC Score" />
    ),
    cell: ({ row }) => (
      <span className="font-mono font-medium pl-1">
        {row.getValue<number>("abc_score").toFixed(3)}
      </span>
    ),
  },
  {
    accessorKey: "distance",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Distance" />
    ),
    cell: ({ row }) => {
      const distance = row.getValue<number>("distance");
      const distanceKb = distance / 1000;
      return (
        <span className="font-mono pl-1">
          {distanceKb > 1000 
            ? `${(distanceKb / 1000).toFixed(1)}M bp` 
            : `${distanceKb.toFixed(0)}K bp`
          }
        </span>
      );
    },
  },
  {
    accessorKey: "tissue",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tissue" />
    ),
    cell: ({ row }) => (
      <Badge variant="secondary" className="capitalize">
        {row.getValue<string>("tissue")}
      </Badge>
    ),
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
];