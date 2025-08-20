"use client";

import Link from "next/link";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { ExternalLink } from "@/components/ui/external-link";
import type { ScentTissue } from "@/lib/variant/scent/types";

export const scentColumns: ColumnDef<ScentTissue>[] = [
  {
    accessorKey: "region",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="SCENT Region"
        sortable={true}
      />
    ),
    cell: ({ row }) => {
      const region = row.getValue("region") as string;
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
    accessorKey: "gene",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Associated Gene"
        sortable={true}
      />
    ),
    cell: ({ row }) => {
      const gene = row.getValue("gene") as string;
      return (
        <div className="text-left min-w-0">
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
    accessorKey: "tissue",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Tissue" sortable={true} />
    ),
    cell: ({ row }) => (
      <div className="text-left">
        <span className="text-sm capitalize font-medium">
          {row.getValue("tissue")}
        </span>
      </div>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "sub_tissue",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Sub Tissue"
        sortable={true}
      />
    ),
    cell: ({ row }) => (
      <div className="text-left">
        <span className="text-sm capitalize text-muted-foreground">
          {row.getValue("sub_tissue")}
        </span>
      </div>
    ),
    enableSorting: true,
  },
];
