import { type ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { roundNumber, isValidNumber } from "@/lib/annotations/helpers";
import type { CV2F } from "./types";

const createCV2FSortingFn = (accessorKey: string) => (rowA: any, rowB: any) => {
  const aVal = rowA.getValue(accessorKey) as number | string | undefined;
  const bVal = rowB.getValue(accessorKey) as number | string | undefined;
  const a = typeof aVal === "string" ? parseFloat(aVal) : aVal;
  const b = typeof bVal === "string" ? parseFloat(bVal) : bVal;
  if (a === undefined && b === undefined) return 0;
  if (a === undefined || isNaN(a)) return 1;
  if (b === undefined || isNaN(b)) return -1;
  return a - b;
};

const renderCV2FValue = (value: number | string | undefined) => {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (!isValidNumber(numValue)) {
    return <span className="text-gray-400">-</span>;
  }
  return <span className="font-mono">{roundNumber(numValue)}</span>;
};

export const cv2fColumns: ColumnDef<CV2F>[] = [
  {
    accessorKey: "Rsid",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="rsID" sortable={true} />
    ),
    cell: ({ row }) => (
      <div className="font-mono text-blue-600">{row.getValue("Rsid")}</div>
    ),
    enableSorting: true,
    filterFn: (row, id, value) => {
      const rsid = row.getValue(id) as string;
      return rsid.toLowerCase().includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "Cm",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Cm (Overall)"
        tooltip="Overall Coefficient of Variation (Cm) is a general measure of the variability across all cell types."
        sortable={true}
      />
    ),
    cell: ({ row }) => renderCV2FValue(row.getValue("Cm")),
    enableSorting: true,
    sortingFn: createCV2FSortingFn("Cm"),
  },
  {
    accessorKey: "Cv2f",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="CV2F"
        tooltip="Coefficient of Variation (CV2F) is a measure of the variability of the variant allele frequency (VAF) across single cells. It is calculated as the standard deviation of the VAF divided by the mean VAF."
        sortable={true}
      />
    ),
    cell: ({ row }) => renderCV2FValue(row.getValue("Cv2f")),
    enableSorting: true,
    sortingFn: createCV2FSortingFn("Cv2f"),
  },
  {
    accessorKey: "LiverCv2f",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Liver CV2F"
        tooltip="Liver Coefficient of Variation (CV2F) is a measure of the variability of the variant allele frequency (VAF) across single cells in liver cells."
        sortable={true}
      />
    ),
    cell: ({ row }) => renderCV2FValue(row.getValue("LiverCv2f")),
    enableSorting: true,
    sortingFn: createCV2FSortingFn("LiverCv2f"),
  },
  {
    accessorKey: "BloodCv2f",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Blood CV2F"
        tooltip="Blood Coefficient of Variation (CV2F) is a measure of the variability of the variant allele frequency (VAF) across single cells in blood cells."
        sortable={true}
      />
    ),
    cell: ({ row }) => renderCV2FValue(row.getValue("BloodCv2f")),
    enableSorting: true,
    sortingFn: createCV2FSortingFn("BloodCv2f"),
  },
  {
    accessorKey: "BrainCv2f",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="Brain CV2F"
        tooltip="Brain Coefficient of Variation (CV2F) is a measure of the variability of the variant allele frequency (VAF) across single cells in brain cells."
        sortable={true}
      />
    ),
    cell: ({ row }) => renderCV2FValue(row.getValue("BrainCv2f")),
    enableSorting: true,
    sortingFn: createCV2FSortingFn("BrainCv2f"),
  },
  {
    accessorKey: "Gm12878Cv2f",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="GM12878 CV2F"
        tooltip="GM12878 Coefficient of Variation (CV2F) is a measure of the variability of the variant allele frequency (VAF) across single cells in GM12878 cells."
        sortable={true}
      />
    ),
    cell: ({ row }) => renderCV2FValue(row.getValue("Gm12878Cv2f")),
    enableSorting: true,
    sortingFn: createCV2FSortingFn("Gm12878Cv2f"),
  },
  {
    accessorKey: "K562Cv2f",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="K562 CV2F"
        tooltip="K562 Coefficient of Variation (CV2F) is a measure of the variability of the variant allele frequency (VAF) across single cells in K562 cells."
        sortable={true}
      />
    ),
    cell: ({ row }) => renderCV2FValue(row.getValue("K562Cv2f")),
    enableSorting: true,
    sortingFn: createCV2FSortingFn("K562Cv2f"),
  },
  {
    accessorKey: "HepG2CV2F",
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title="HepG2 CV2F"
        tooltip="HepG2 Coefficient of Variation (CV2F) is a measure of the variability of the variant allele frequency (VAF) across single cells in HepG2 cells."
        sortable={true}
      />
    ),
    cell: ({ row }) => renderCV2FValue(row.getValue("HepG2CV2F")),
    enableSorting: true,
    sortingFn: createCV2FSortingFn("HepG2CV2F"),
  },
];
