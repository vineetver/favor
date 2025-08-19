"use client";

import { DataGrid } from "@/components/ui/data-grid";
import { ancestryColumns } from "@/lib/variant/ancestry/table-columns";
import { formatFrequency } from "@/lib/utils/general";
import type { AncestryFrequency } from "@/lib/variant/gnomad/utils";

interface AncestryFrequencyTableProps {
  data: AncestryFrequency[];
}

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
