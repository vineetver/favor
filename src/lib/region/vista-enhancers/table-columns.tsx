"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { ExternalLink } from "@/components/ui/external-link";
import type { VistaEnhancer } from "./types";

export const vistaEnhancerColumns: ColumnDef<VistaEnhancer>[] = [
  {
    accessorKey: "element_id",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Element ID"
        tooltip="VISTA enhancer element identifier"
        sortable={true}
      />
    ),
    cell: ({ row }) => {
      const elementId = row.getValue("element_id") as string;
      return (
        <div className="text-left min-w-0">
          <span className="text-sm font-mono font-medium text-primary">
            {elementId}
          </span>
        </div>
      );
    },
    enableSorting: true,
    filterFn: (row, id, value) => {
      const elementId = row.getValue(id) as string;
      return elementId.toLowerCase().includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "chromosome",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Genomic Region"
        tooltip="Chromosomal location of the enhancer"
        sortable={true}
      />
    ),
    cell: ({ row }) => {
      const chrom = row.original.chromosome;
      const start = row.original.start_position;
      const end = row.original.end_position;
      const region = `${chrom}:${start}-${end}`;
      return (
        <div className="text-left min-w-0">
          <ExternalLink
            href={`https://favor.genohub.org/hg38/region/${region}/SNV-summary/allele-distribution`}
            className="text-sm font-mono truncate hover:text-primary transition-colors"
          >
            {region}
          </ExternalLink>
        </div>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: "element_description",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Description"
        tooltip="Functional description of the enhancer element"
        sortable={true}
      />
    ),
    cell: ({ row }) => {
      const description = row.getValue("element_description") as string;
      return (
        <div className="text-left max-w-sm">
          <span className="text-sm text-muted-foreground truncate">
            {description}
          </span>
        </div>
      );
    },
    enableSorting: true,
    filterFn: (row, id, value) => {
      const description = row.getValue(id) as string;
      return description.toLowerCase().includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "expression",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Expression"
        tooltip="Expression pattern observed in transgenic assays"
        sortable={true}
      />
    ),
    cell: ({ row }) => {
      const expression = row.getValue("expression") as string;
      const variant = expression.toLowerCase().includes("positive") ? "default" : 
                     expression.toLowerCase().includes("negative") ? "secondary" : 
                     "outline";
      return (
        <Badge variant={variant as any} className="text-xs">
          {expression}
        </Badge>
      );
    },
    enableSorting: true,
    filterFn: (row, id, value) => {
      const expression = row.getValue(id) as string;
      return expression.toLowerCase().includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "tissues",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Tissues"
        tooltip="Tissues where enhancer activity was observed"
        sortable={true}
      />
    ),
    cell: ({ row }) => {
      const tissues = row.getValue("tissues") as string;
      return (
        <div className="text-left max-w-xs">
          <span className="text-sm capitalize">
            {tissues}
          </span>
        </div>
      );
    },
    enableSorting: true,
    filterFn: (row, id, value) => {
      const tissues = row.getValue(id) as string;
      return tissues.toLowerCase().includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "stage",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Developmental Stage"
        tooltip="Developmental stage when enhancer activity was tested"
        sortable={true}
      />
    ),
    cell: ({ row }) => {
      const stage = row.getValue("stage") as string;
      return (
        <Badge variant="secondary" className="text-xs">
          {stage}
        </Badge>
      );
    },
    enableSorting: true,
    filterFn: (row, id, value) => {
      const stage = row.getValue(id) as string;
      return stage.toLowerCase().includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "organism",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Organism"
        tooltip="Organism used in transgenic assays"
        sortable={true}
      />
    ),
    cell: ({ row }) => {
      const organism = row.getValue("organism") as string;
      return (
        <Badge variant="outline" className="text-xs">
          {organism}
        </Badge>
      );
    },
    enableSorting: true,
    filterFn: (row, id, value) => {
      const organism = row.getValue(id) as string;
      return organism.toLowerCase().includes(value.toLowerCase());
    },
  },
];