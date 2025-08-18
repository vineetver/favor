"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataGrid } from "@/components/ui/data-grid";
import { createColumnHeader } from "@/components/ui/data-table-column-header";

interface AncestryFrequency {
  population_code: string;
  name: string;
  g1000: number | undefined;
  gnomad31: number | undefined;
  gnomad41_exome: number | undefined;
  gnomad41_genome: number | undefined;
}

interface AncestryFrequencyTableProps {
  data: AncestryFrequency[];
}

const formatFrequency = (value: number | undefined): string => {
  if (value === undefined || value === null) return "N/A";
  if (value === 0) return "0";
  return value.toExponential(3);
};

const ancestryColumns: ColumnDef<AncestryFrequency>[] = [
  {
    accessorKey: "name",
    header: createColumnHeader("Population"),
    cell: ({ row }) => (
      <div className="font-medium">{row.getValue("name")}</div>
    ),
  },
  {
    accessorKey: "g1000",
    header: createColumnHeader("1000G Phase 3", {
      tooltip: "Allele frequency from 1000 Genomes Phase 3",
    }),
    cell: ({ row }) => (
      <div className="font-mono text-blue-600">
        {formatFrequency(row.getValue("g1000"))}
      </div>
    ),
  },
  {
    accessorKey: "gnomad31",
    header: createColumnHeader("gnomAD v3.1", {
      tooltip: "Allele frequency from gnomAD v3.1 database",
    }),
    cell: ({ row }) => (
      <div className="font-mono text-green-600">
        {formatFrequency(row.getValue("gnomad31"))}
      </div>
    ),
  },
  {
    accessorKey: "gnomad41_exome",
    header: createColumnHeader("gnomAD v4.1 Exome", {
      tooltip: "Allele frequency from gnomAD v4.1 Exome dataset",
    }),
    cell: ({ row }) => (
      <div className="font-mono text-purple-600">
        {formatFrequency(row.getValue("gnomad41_exome"))}
      </div>
    ),
  },
  {
    accessorKey: "gnomad41_genome",
    header: createColumnHeader("gnomAD v4.1 Genome", {
      tooltip: "Allele frequency from gnomAD v4.1 Genome dataset",
    }),
    cell: ({ row }) => (
      <div className="font-mono text-orange-600">
        {formatFrequency(row.getValue("gnomad41_genome"))}
      </div>
    ),
  },
];

export function AncestryFrequencyTable({ data }: AncestryFrequencyTableProps) {
  const exportTSV = (filteredData: AncestryFrequency[]) => {
    const headers = ["Population", "1000G Phase 3", "gnomAD v3.1", "gnomAD v4.1 Exome", "gnomAD v4.1 Genome"];
    const rows = filteredData.map((row) => [
      row.name,
      formatFrequency(row.g1000),
      formatFrequency(row.gnomad31),
      formatFrequency(row.gnomad41_exome),
      formatFrequency(row.gnomad41_genome),
    ]);

    const tsv = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join("\n");
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ancestry_allele_frequencies.tsv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const facetedFilters = [
    {
      columnId: "name",
      title: "Population",
      options: Array.from(new Set(data.map(row => row.name))).map(name => ({
        label: name,
        value: name,
      })),
    },
  ];

  return (
    <DataGrid
      columns={ancestryColumns}
      data={data}
      title="Ancestry Allele Frequencies"
      searchKey="name"
      searchPlaceholder="Search populations..."
      facetedFilters={facetedFilters}
      onExport={exportTSV}
      exportFilename="ancestry_allele_frequencies.tsv"
      initialPageSize={15}
      emptyState={{
        title: "No frequency data",
        description: "No ancestry-specific frequency data is available.",
        icon: "database",
        dataType: "frequency data",
      }}
    />
  );
}

export type { AncestryFrequency };
