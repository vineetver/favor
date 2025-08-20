import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { formatFrequency } from "@/lib/utils/general";
import type { AncestryFrequency } from "@/lib/variant/gnomad/utils";

// Custom sorting function for frequency values
const createFrequencySortingFn =
  (accessorKey: string) => (rowA: any, rowB: any) => {
    const a = rowA.getValue(accessorKey) as number | undefined;
    const b = rowB.getValue(accessorKey) as number | undefined;
    if (a === undefined && b === undefined) return 0;
    if (a === undefined) return 1;
    if (b === undefined) return -1;
    return a - b;
  };

// Ancestry frequency table columns
export const ancestryColumns: ColumnDef<AncestryFrequency>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Population"
        sortable={true}
      />
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
    enableSorting: true,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "g1000",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="1000G Phase 3"
        tooltip="Allele frequency from 1000 Genomes Phase 3 database"
        sortable={true}
      />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-blue-600">
        {formatFrequency(row.getValue("g1000"))}
      </div>
    ),
    enableSorting: true,
    sortingFn: createFrequencySortingFn("g1000"),
  },
  {
    accessorKey: "gnomad31",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="gnomAD v3.1"
        tooltip="Allele frequency from gnomAD v3.1 database"
        sortable={true}
      />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-green-600">
        {formatFrequency(row.getValue("gnomad31"))}
      </div>
    ),
    enableSorting: true,
    sortingFn: createFrequencySortingFn("gnomad31"),
  },
  {
    accessorKey: "gnomad41_exome",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="gnomAD v4.1 Exome"
        tooltip="Allele frequency from gnomAD v4.1 Exome dataset"
        sortable={true}
      />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-purple-600">
        {formatFrequency(row.getValue("gnomad41_exome"))}
      </div>
    ),
    enableSorting: true,
    sortingFn: createFrequencySortingFn("gnomad41_exome"),
  },
  {
    accessorKey: "gnomad41_genome",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="gnomAD v4.1 Genome"
        tooltip="Allele frequency from gnomAD v4.1 Genome dataset"
        sortable={true}
      />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-purple-500">
        {formatFrequency(row.getValue("gnomad41_genome"))}
      </div>
    ),
    enableSorting: true,
    sortingFn: createFrequencySortingFn("gnomad41_genome"),
  },
];

// Chart data configuration for ancestry
export const ANCESTRY_CHART_CONFIG = {
  title: "Ancestry Allele Frequencies",
  subtitle:
    "Population-specific allele frequencies across different genomic datasets",
  keys: [
    "1000G Phase 3",
    "gnomAD v3.1",
    "gnomAD v4.1 Exome",
    "gnomAD v4.1 Genome",
  ] as string[],
  colors: [
    "#3b82f6", // blue for 1000G
    "#10b981", // green for gnomAD v3.1
    "#8b5cf6", // purple-600 for gnomAD v4.1 Exome
    "#a855f7", // purple-500 for gnomAD v4.1 Genome
  ] as string[],
};
