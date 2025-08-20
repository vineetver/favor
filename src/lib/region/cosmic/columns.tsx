import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { safeCellRenderer, isValidString, isValidNumber } from "@/lib/annotations/helpers";

export interface Cosmic {
  variant_vcf: string;
  cds: string;
  aa: string;
  genome_screen_sample_count: number;
  is_canonical: string;
  so_term: string;
}

export const cosmicColumns: ColumnDef<Cosmic>[] = [
  {
    accessorKey: "variant_vcf",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Variant"
        tooltip="VCF format variant notation representing genomic position and alleles"
        sortable={true}
      />
    ),
    cell: ({ row }) => {
      const value = row.original.variant_vcf;
      return safeCellRenderer(
        value,
        (str: string) => <span className="font-mono text-sm">{str}</span>,
        isValidString,
      );
    },
    enableSorting: true,
    filterFn: (row, id, value) => {
      const variant = row.getValue(id) as string;
      return variant.toLowerCase().includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "cds",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="CDS Change"
        tooltip="Coding sequence mutation following HGVS notation. Shows nucleotide changes in the coding region."
        sortable={true}
      />
    ),
    cell: ({ row }) => {
      const value = row.original.cds;
      return safeCellRenderer(
        value,
        (str: string) => <span className="font-mono text-sm">{str}</span>,
        isValidString,
      );
    },
    enableSorting: true,
    filterFn: (row, id, value) => {
      const cds = row.getValue(id) as string;
      return cds.toLowerCase().includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "aa",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Protein Change"
        tooltip="Amino acid change from the mutation. Format follows HGVS protein notation (e.g., p.V600E)."
        sortable={true}
      />
    ),
    cell: ({ row }) => {
      const value = row.original.aa;
      return safeCellRenderer(
        value,
        (str: string) => {
          if (str === "p.?") {
            return <span className="font-mono text-sm text-muted-foreground">{str}</span>;
          }
          return <span className="font-mono text-sm bg-muted/20">{str}</span>;
        },
        isValidString,
      );
    },
    enableSorting: true,
    filterFn: (row, id, value) => {
      const aa = row.getValue(id) as string;
      return aa.toLowerCase().includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "so_term",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Mutation Type"
        tooltip="Type of mutation (SNV, insertion, deletion, etc.)"
        sortable={true}
      />
    ),
    cell: ({ row }) => {
      const value = row.original.so_term;
      return safeCellRenderer(
        value,
        (str: string) => {
          const typeColors = {
            "SNV": "bg-blue-100 text-blue-800",
            "insertion": "bg-green-100 text-green-800",
            "deletion": "bg-red-100 text-red-800",
            "complex": "bg-purple-100 text-purple-800"
          };
          const colorClass = typeColors[str as keyof typeof typeColors] || "bg-gray-100 text-gray-800";
          return (
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${colorClass}`}>
              {str}
            </span>
          );
        },
        isValidString,
      );
    },
    enableSorting: true,
    filterFn: (row, id, value) => {
      return row.getValue(id) === value;
    },
  },
  {
    accessorKey: "is_canonical",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Canonical"
        tooltip="Whether this mutation affects the Ensembl canonical transcript"
        sortable={true}
      />
    ),
    cell: ({ row }) => {
      const value = row.original.is_canonical;
      return safeCellRenderer(
        value,
        (str: string) => {
          switch (str) {
            case "y":
              return (
                <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">
                  Yes
                </span>
              );
            case "n":
              return (
                <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">
                  No
                </span>
              );
            default:
              return undefined;
          }
        },
        isValidString,
      );
    },
    enableSorting: true,
    filterFn: (row, id, value) => {
      return row.getValue(id) === value;
    },
  },
  {
    accessorKey: "genome_screen_sample_count",
    header: ({ column }) => (
      <DataTableColumnHeader 
        column={column} 
        title="Sample Count"
        tooltip="Number of samples where this variant was observed in COSMIC cancer genome screens"
        sortable={true}
      />
    ),
    cell: ({ row }) => {
      const value = row.original.genome_screen_sample_count;
      return safeCellRenderer(
        value,
        (num: number) => <span className="font-medium tabular-nums">{num.toLocaleString()}</span>,
        isValidNumber,
      );
    },
    enableSorting: true,
  },
];

export const cosmicFacetedFilters = [
  {
    columnId: "is_canonical",
    title: "Canonical Transcript",
    options: [
      { label: "Yes", value: "y" },
      { label: "No", value: "n" },
    ],
  },
  {
    columnId: "so_term",
    title: "Mutation Type",
    options: [
      { label: "SNV", value: "SNV" },
      { label: "Insertion", value: "insertion" },
      { label: "Deletion", value: "deletion" },
      { label: "Complex", value: "complex" },
    ],
  },
];