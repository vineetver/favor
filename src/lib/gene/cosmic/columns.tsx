import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { ExternalLink } from "@/components/ui/external-link";
import { safeCellRenderer, isValidString, isValidNumber } from "@/lib/annotations/helpers";
import { cosmicMutationTypeCCode, cosmicCanonicalCCode } from "@/lib/utils/colors";

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
        (str: string) => (
          <ExternalLink
            href={`/hg38/variant/${encodeURIComponent(str)}/summary/basic`}
            className="font-mono text-sm hover:text-primary"
          >
            {str}
          </ExternalLink>
        ),
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
          return <span className="font-mono text-sm bg-black/20 px-2 py-1 rounded">{str}</span>;
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
        (str: string) => cosmicMutationTypeCCode(str),
        isValidString,
      );
    },
    enableSorting: true,
    filterFn: (row, id, value) => {
      if (!value || (Array.isArray(value) && value.length === 0)) return true;
      const cellValue = row.getValue(id) as string;
      if (Array.isArray(value)) {
        return value.includes(cellValue);
      }
      return cellValue === value;
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
        (str: string) => cosmicCanonicalCCode(str),
        isValidString,
      );
    },
    enableSorting: true,
    filterFn: (row, id, value) => {
      if (!value || (Array.isArray(value) && value.length === 0)) return true;
      const cellValue = row.getValue(id) as string;
      if (Array.isArray(value)) {
        return value.includes(cellValue);
      }
      return cellValue === value;
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
    filterFn: (row, id, value) => {
      if (!value || (Array.isArray(value) && value.length === 0)) return true;
      const count = row.getValue(id) as number;
      
      const checkValue = (val: string) => {
        switch (val) {
          case "1":
            return count === 1;
          case "2-5":
            return count >= 2 && count <= 5;
          case "6-10":
            return count >= 6 && count <= 10;
          case "11+":
            return count >= 11;
          default:
            return false;
        }
      };
      
      if (Array.isArray(value)) {
        return value.some(checkValue);
      }
      return checkValue(value);
    },
  },
];