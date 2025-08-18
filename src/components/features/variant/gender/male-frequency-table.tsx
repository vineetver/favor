"use client";

import { DataGrid } from "@/components/ui/data-grid";
import { maleColumns } from "@/lib/variant/gender/table-columns";
import { formatFrequency } from "@/lib/utils/general";
import type { MaleFrequency } from "@/lib/variant/gnomad/utils";

interface MaleFrequencyTableProps {
  data: MaleFrequency[];
}

export function MaleFrequencyTable({ data }: MaleFrequencyTableProps) {
  const exportTSV = (filteredData: MaleFrequency[]) => {
    const headers = ["Population", "gnomAD v3.1 (Male)", "gnomAD v4.1 Exome (Male)", "gnomAD v4.1 Genome (Male)"];
    const rows = filteredData.map((row) => [
      row.name,
      formatFrequency(row.male31),
      formatFrequency(row.male41_exome),
      formatFrequency(row.male41_genome),
    ]);

    const tsv = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join("\n");
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "male_allele_frequencies.tsv";
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
      columns={maleColumns}
      data={data}
      title="Male Allele Frequencies"
      searchKey="name"
      searchPlaceholder="Search populations..."
      facetedFilters={facetedFilters}
      onExport={exportTSV}
      exportFilename="male_allele_frequencies.tsv"
      initialPageSize={15}
      emptyState={{
        title: "No frequency data",
        description: "No male-specific frequency data is available.",
        icon: "database",
        dataType: "frequency data",
      }}
    />
  );
}