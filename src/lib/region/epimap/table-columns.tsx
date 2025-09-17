import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { stateFullNameCCode } from "@/lib/utils/colors";
import type { Epimap } from "./types";

export const epimapColumns: ColumnDef<Epimap>[] = [
  {
    accessorKey: "state_full_name",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Chromatin State"
        tooltip="Predicted chromatin state (promoter, enhancer, etc.)"
        sortable={true}
      />
    ),
    cell: ({ row }) => stateFullNameCCode(row.original.state_full_name),
    enableSorting: true,
    filterFn: (row, id, value) => {
      const state = row.getValue(id) as string;
      return state.toLowerCase().includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "chromosome",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Chromatin Region"
        tooltip="Genomic coordinates of the chromatin region"
        sortable={true}
      />
    ),
    cell: ({ row }) => {
      const chrom = row.original.chromosome;
      const start = row.original.start_position;
      const end = row.original.end_position;
      return (
        <div className="font-mono text-sm">
          {chrom}:{start.toLocaleString()}-{end.toLocaleString()}
        </div>
      );
    },
    enableSorting: true,
  },
  {
    accessorKey: "sample_name",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Sample/Tissue"
        tooltip="Biological sample or tissue type"
        sortable={true}
      />
    ),
    cell: ({ row }) => (
      <Badge variant="outline">{row.original.sample_name}</Badge>
    ),
    enableSorting: true,
    filterFn: (row, id, value) => {
      const sample = row.getValue(id) as string;
      return sample.toLowerCase().includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "lifestage",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Developmental Stage"
        tooltip="Developmental stage (embryonic, fetal, adult, etc.)"
        sortable={true}
      />
    ),
    cell: ({ row }) => (
      <Badge variant="secondary">{row.original.lifestage}</Badge>
    ),
    enableSorting: true,
    filterFn: (row, id, value) => {
      const stage = row.getValue(id) as string;
      return stage.toLowerCase().includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "sex",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Sex"
        tooltip="Biological sex of sample"
        sortable={true}
      />
    ),
    cell: ({ row }) => <Badge variant="secondary">{row.original.sex}</Badge>,
    enableSorting: true,
    filterFn: (row, id, value) => {
      const sex = row.getValue(id) as string;
      return sex.toLowerCase().includes(value.toLowerCase());
    },
  },
];
