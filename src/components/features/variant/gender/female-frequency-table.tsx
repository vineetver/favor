"use client";

import { DataGrid } from "@/components/ui/data-grid";
import { femaleColumns } from "@/lib/variant/gender/table-columns";
import { formatFrequency } from "@/lib/utils/general";
import type { FemaleFrequency } from "@/lib/variant/gnomad/utils";

interface FemaleFrequencyTableProps {
  data: FemaleFrequency[];
}

export function FemaleFrequencyTable({ data }: FemaleFrequencyTableProps) {
  const exportTSV = (filteredData: FemaleFrequency[]) => {
    const headers = ["Population", "gnomAD v3.1 (Female)", "gnomAD v4.1 Exome (Female)", "gnomAD v4.1 Genome (Female)"];
    const rows = filteredData.map((row) => [
      row.name,
      formatFrequency(row.female31),
      formatFrequency(row.female41_exome),
      formatFrequency(row.female41_genome),
    ]);

    const tsv = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join("\n");
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "female_allele_frequencies.tsv";
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
      columns={femaleColumns}
      data={data}
      title="Female Allele Frequencies"
      searchPlaceholder="Search populations..."
      facetedFilters={facetedFilters}
      onExport={exportTSV}
      exportFilename="female_allele_frequencies.tsv"
      initialPageSize={15}
      emptyState={{
        title: "No frequency data",
        description: "No female-specific frequency data is available.",
        icon: "database",
        dataType: "frequency data",
      }}
    />
  );
}