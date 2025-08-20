import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { formatFrequency } from "@/lib/utils/general";
import type {
  FemaleFrequency,
  MaleFrequency,
} from "@/lib/variant/gnomad/utils";

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

// Female frequency table columns
export const femaleColumns: ColumnDef<FemaleFrequency>[] = [
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
    accessorKey: "female31",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="gnomAD v3.1 (Female)"
        tooltip="Female allele frequency from gnomAD v3.1 database"
        sortable={true}
      />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-pink-600">
        {formatFrequency(row.getValue("female31"))}
      </div>
    ),
    enableSorting: true,
    sortingFn: createFrequencySortingFn("female31"),
  },
  {
    accessorKey: "female41_exome",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="gnomAD v4.1 Exome (Female)"
        tooltip="Female allele frequency from gnomAD v4.1 Exome dataset"
        sortable={true}
      />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-pink-700">
        {formatFrequency(row.getValue("female41_exome"))}
      </div>
    ),
    enableSorting: true,
    sortingFn: createFrequencySortingFn("female41_exome"),
  },
  {
    accessorKey: "female41_genome",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="gnomAD v4.1 Genome (Female)"
        tooltip="Female allele frequency from gnomAD v4.1 Genome dataset"
        sortable={true}
      />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-pink-800">
        {formatFrequency(row.getValue("female41_genome"))}
      </div>
    ),
    enableSorting: true,
    sortingFn: createFrequencySortingFn("female41_genome"),
  },
];

// Male frequency table columns
export const maleColumns: ColumnDef<MaleFrequency>[] = [
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
    accessorKey: "male31",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="gnomAD v3.1 (Male)"
        tooltip="Male allele frequency from gnomAD v3.1 database"
        sortable={true}
      />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-blue-600">
        {formatFrequency(row.getValue("male31"))}
      </div>
    ),
    enableSorting: true,
    sortingFn: createFrequencySortingFn("male31"),
  },
  {
    accessorKey: "male41_exome",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="gnomAD v4.1 Exome (Male)"
        tooltip="Male allele frequency from gnomAD v4.1 Exome dataset"
        sortable={true}
      />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-blue-700">
        {formatFrequency(row.getValue("male41_exome"))}
      </div>
    ),
    enableSorting: true,
    sortingFn: createFrequencySortingFn("male41_exome"),
  },
  {
    accessorKey: "male41_genome",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="gnomAD v4.1 Genome (Male)"
        tooltip="Male allele frequency from gnomAD v4.1 Genome dataset"
        sortable={true}
      />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-blue-800">
        {formatFrequency(row.getValue("male41_genome"))}
      </div>
    ),
    enableSorting: true,
    sortingFn: createFrequencySortingFn("male41_genome"),
  },
];

// Chart data configuration for female frequencies
export const FEMALE_CHART_CONFIG = {
  title: "Female Allele Frequencies",
  subtitle: "XX chromosome allele frequencies across different populations",
  keys: ["gnomAD v3.1", "gnomAD v4.1 Exome", "gnomAD v4.1 Genome"] as string[],
  colors: [
    "#ec4899", // pink-500 for v3.1
    "#be185d", // pink-700 for v4.1 Exome
    "#831843", // pink-800 for v4.1 Genome
  ] as string[],
};

// Chart data configuration for male frequencies
export const MALE_CHART_CONFIG = {
  title: "Male Allele Frequencies",
  subtitle: "XY chromosome allele frequencies across different populations",
  keys: ["gnomAD v3.1", "gnomAD v4.1 Exome", "gnomAD v4.1 Genome"] as string[],
  colors: [
    "#3b82f6", // blue-500 for v3.1
    "#1d4ed8", // blue-700 for v4.1 Exome
    "#1e3a8a", // blue-800 for v4.1 Genome
  ] as string[],
};
