"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { TrendingUp } from "lucide-react";
import type { Eqtl, Crispr, Chiapet } from "@/components/features/ccre/linked-genes/types";

export const eqtlColumns: ColumnDef<Eqtl>[] = [
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Target Gene" />
    ),
    accessorKey: "gene_name",
    cell: ({ row }) => (
      <div className="space-y-1">
        <span className="font-semibold text-sm text-primary">{row.original.gene_name}</span>
        <Badge variant="secondary" className="text-xs block w-fit">
          {row.original.gene_type}
        </Badge>
      </div>
    ),
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Effect Size" />
    ),
    accessorKey: "slope",
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const a = Math.abs(rowA.getValue("slope") as number);
      const b = Math.abs(rowB.getValue("slope") as number);
      return a - b;
    },
    cell: ({ row }) => {
      const slope = row.original.slope;
      const isPositive = slope > 0;
      const magnitude = Math.abs(slope);
      
      return (
        <div className="flex items-center gap-2">
          <div className={`text-sm font-mono font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '↗' : '↘'} {magnitude.toFixed(3)}
          </div>
          <div className="text-xs text-muted-foreground">
            {isPositive ? 'Activating' : 'Repressive'}
          </div>
        </div>
      );
    },
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Statistical Significance" />
    ),
    accessorKey: "p_value",
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const a = rowA.getValue("p_value") as number;
      const b = rowB.getValue("p_value") as number;
      return a - b;
    },
    cell: ({ row }) => {
      const pValue = row.original.p_value;
      const isHighlySignificant = pValue < 1e-8;
      const isSignificant = pValue < 1e-5;
      
      return (
        <div className="space-y-1">
          <Badge
            variant={isHighlySignificant ? "default" : isSignificant ? "secondary" : "outline"}
            className="text-xs font-mono"
          >
            {pValue.toExponential(1)}
          </Badge>
          <div className="text-xs text-muted-foreground">
            {isHighlySignificant ? 'Highly significant' : isSignificant ? 'Significant' : 'Nominal'}
          </div>
        </div>
      );
    },
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tissue" />
    ),
    accessorKey: "tissue",
    cell: ({ row }) => (
      <div className="max-w-40 text-sm" title={row.original.tissue}>
        <div className="truncate font-medium">{row.original.tissue}</div>
      </div>
    ),
  },
];

export const crisprColumns: ColumnDef<Crispr>[] = [
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Target Gene" />
    ),
    accessorKey: "gene_name",
    cell: ({ row }) => (
      <div className="space-y-1">
        <span className="font-semibold text-sm text-primary">{row.original.gene_name}</span>
        <Badge variant="secondary" className="text-xs block w-fit">
          {row.original.gene_type}
        </Badge>
      </div>
    ),
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Perturbation Effect" />
    ),
    accessorKey: "effect_size",
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const a = Math.abs(parseFloat(rowA.getValue("effect_size") as string) || 0);
      const b = Math.abs(parseFloat(rowB.getValue("effect_size") as string) || 0);
      return a - b;
    },
    cell: ({ row }) => {
      const effectSize = parseFloat(row.original.effect_size) || 0;
      const isPositive = effectSize > 0;
      const magnitude = Math.abs(effectSize);
      
      return (
        <div className="flex items-center gap-2">
          <div className={`text-sm font-mono font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '📈' : '📉'} {magnitude.toFixed(2)}
          </div>
          <div className="text-xs text-muted-foreground">
            {isPositive ? 'Activation' : 'Repression'}
          </div>
        </div>
      );
    },
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Statistical Confidence" />
    ),
    accessorKey: "p_value",
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const a = rowA.getValue("p_value") as number;
      const b = rowB.getValue("p_value") as number;
      return a - b;
    },
    cell: ({ row }) => {
      const pValue = row.original.p_value;
      const isHighlySignificant = pValue < 1e-6;
      const isSignificant = pValue < 1e-4;
      
      return (
        <div className="space-y-1">
          <Badge
            variant={isHighlySignificant ? "default" : isSignificant ? "secondary" : "outline"}
            className="text-xs font-mono"
          >
            {pValue.toExponential(1)}
          </Badge>
          <div className="text-xs text-muted-foreground">
            {isHighlySignificant ? 'High confidence' : isSignificant ? 'Significant' : 'Low confidence'}
          </div>
        </div>
      );
    },
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Biosample" />
    ),
    accessorKey: "biosample",
    cell: ({ row }) => (
      <div className="text-sm truncate" title={row.original.biosample}>
        {row.original.biosample}
      </div>
    ),
  },
];

export const chiapetColumns: ColumnDef<Chiapet>[] = [
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Connected Gene" />
    ),
    accessorKey: "gene_name",
    cell: ({ row }) => (
      <div className="space-y-1">
        <span className="font-semibold text-sm text-primary">{row.original.gene_name}</span>
        <Badge variant="secondary" className="text-xs block w-fit">
          {row.original.gene_type}
        </Badge>
      </div>
    ),
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Interaction Strength" />
    ),
    accessorKey: "score",
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const a = parseFloat(rowA.getValue("score") as string) || 0;
      const b = parseFloat(rowB.getValue("score") as string) || 0;
      return a - b;
    },
    cell: ({ row }) => {
      const score = parseFloat(row.original.score) || 0;
      const strength = score > 50 ? 'very-strong' : score > 20 ? 'strong' : score > 5 ? 'moderate' : 'weak';
      const colorMap = {
        'weak': 'text-yellow-600 bg-yellow-50',
        'moderate': 'text-orange-600 bg-orange-50',
        'strong': 'text-red-600 bg-red-50',
        'very-strong': 'text-red-700 bg-red-100'
      };
      const strengthLabel = {
        'weak': 'Weak',
        'moderate': 'Moderate', 
        'strong': 'Strong',
        'very-strong': 'Very Strong'
      };
      
      return (
        <div className="space-y-1">
          <div className={`px-2 py-1 rounded text-sm font-bold flex items-center gap-1 ${colorMap[strength]}`}>
            <TrendingUp className="h-4 w-4 opacity-75" />
            {score.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">
            {strengthLabel[strength]} interaction
          </div>
        </div>
      );
    },
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Statistical Evidence" />
    ),
    accessorKey: "p_value",
    enableSorting: true,
    sortingFn: (rowA, rowB) => {
      const a = parseFloat(rowA.getValue("p_value") as string) || 1;
      const b = parseFloat(rowB.getValue("p_value") as string) || 1;
      return a - b;
    },
    cell: ({ row }) => {
      const pValue = parseFloat(row.original.p_value) || 1;
      const isSignificant = pValue < 0.01;
      const isHighlySignificant = pValue < 0.001;
      
      return (
        <div className="space-y-1">
          <Badge
            variant={isHighlySignificant ? "default" : isSignificant ? "secondary" : "outline"}
            className="text-xs font-mono"
          >
            {pValue.toExponential(1)}
          </Badge>
          <div className="text-xs text-muted-foreground">
            {isHighlySignificant ? 'Highly significant' : isSignificant ? 'Significant' : 'Nominal'}
          </div>
        </div>
      );
    },
  },
  {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Biosample" />
    ),
    accessorKey: "biosample",
    cell: ({ row }) => (
      <div className="text-sm truncate" title={row.original.biosample}>
        {row.original.biosample}
      </div>
    ),
  },
];