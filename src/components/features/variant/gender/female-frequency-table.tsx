"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataGrid } from "@/components/ui/data-grid";
import { createColumnHeader } from "@/components/ui/data-table-column-header";
import type { FemaleFrequency } from "@/lib/variant/gnomad/utils";

const formatFrequency = (value: number | undefined | null): string => {
  if (value === undefined || value === null || value === 0) {
    return "—";
  }
  return value.toExponential(3);
};

const femaleColumns: ColumnDef<FemaleFrequency>[] = [
  {
    accessorKey: "name",
    header: createColumnHeader("Population", {
      sortable: true,
    }),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "female31",
    header: createColumnHeader("Female (gnomAD v3.1)", {
      tooltip: "Female allele frequency from gnomAD v3.1 database",
      sortable: true,
    }),
    cell: ({ row }) => (
      <div className="font-mono text-pink-600">
        {formatFrequency(row.getValue("female31"))}
      </div>
    ),
    sortingFn: (rowA, rowB) => {
      const a = rowA.getValue("female31") as number | undefined;
      const b = rowB.getValue("female31") as number | undefined;
      if (a === undefined && b === undefined) return 0;
      if (a === undefined) return 1;
      if (b === undefined) return -1;
      return a - b;
    },
  },
  {
    accessorKey: "female41_exome",
    header: createColumnHeader("Female (gnomAD v4.1 Exome)", {
      tooltip: "Female allele frequency from gnomAD v4.1 Exome dataset",
      sortable: true,
    }),
    cell: ({ row }) => (
      <div className="font-mono text-pink-700">
        {formatFrequency(row.getValue("female41_exome"))}
      </div>
    ),
    sortingFn: (rowA, rowB) => {
      const a = rowA.getValue("female41_exome") as number | undefined;
      const b = rowB.getValue("female41_exome") as number | undefined;
      if (a === undefined && b === undefined) return 0;
      if (a === undefined) return 1;
      if (b === undefined) return -1;
      return a - b;
    },
  },
  {
    accessorKey: "female41_genome",
    header: createColumnHeader("Female (gnomAD v4.1 Genome)", {
      tooltip: "Female allele frequency from gnomAD v4.1 Genome dataset",
      sortable: true,
    }),
    cell: ({ row }) => (
      <div className="font-mono text-pink-800">
        {formatFrequency(row.getValue("female41_genome"))}
      </div>
    ),
    sortingFn: (rowA, rowB) => {
      const a = rowA.getValue("female41_genome") as number | undefined;
      const b = rowB.getValue("female41_genome") as number | undefined;
      if (a === undefined && b === undefined) return 0;
      if (a === undefined) return 1;
      if (b === undefined) return -1;
      return a - b;
    },
  },
];

interface FemaleFrequencyTableProps {
  data: FemaleFrequency[];
}

export function FemaleFrequencyTable({ data }: FemaleFrequencyTableProps) {
  return (
    <div className="rounded-lg border border-border/50">
      <DataGrid
        data={data}
        columns={femaleColumns}
        initialPageSize={10}
        searchKey="name"
        searchPlaceholder="Search populations..."
        showSearch={data.length > 5}
        showExport={true}
        exportFilename="female-allele-frequencies"
      />
    </div>
  );
}