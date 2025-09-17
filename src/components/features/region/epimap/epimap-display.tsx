"use client";

import { DataGrid } from "@/components/ui/data-grid";
import { epimapColumns } from "@/lib/region/epimap/table-columns";
import type { Epimap } from "@/lib/region/epimap/types";

interface EpimapDisplayProps {
  data: Epimap[] | null;
}

export function EpimapDisplay({ data }: EpimapDisplayProps) {
  const exportTSV = (filteredData: Epimap[]) => {
    const headers = [
      "Chromatin State",
      "Chromosome",
      "Start Position",
      "End Position",
      "Sample/Tissue",
      "Developmental Stage",
      "Sex",
      "Category",
      "Type",
    ];

    const rows = filteredData.map((row) => [
      row.state_full_name,
      row.chromosome,
      row.start_position.toString(),
      row.end_position.toString(),
      row.sample_name,
      row.lifestage,
      row.sex,
      row.category,
      row.type,
    ]);

    const tsv = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join(
      "\n",
    );
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "epimap_data.tsv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const facetedFilters = data
    ? [
        {
          columnId: "state_full_name",
          title: "Chromatin State",
          options: Array.from(
            new Set(data.map((row) => row.state_full_name)),
          ).map((state) => ({
            label: state,
            value: state,
          })),
        },
        {
          columnId: "sample_name",
          title: "Sample/Tissue",
          options: Array.from(new Set(data.map((row) => row.sample_name))).map(
            (sample) => ({
              label: sample,
              value: sample,
            }),
          ),
        },
        {
          columnId: "lifestage",
          title: "Developmental Stage",
          options: Array.from(new Set(data.map((row) => row.lifestage))).map(
            (stage) => ({
              label: stage,
              value: stage,
            }),
          ),
        },
        {
          columnId: "sex",
          title: "Sex",
          options: Array.from(new Set(data.map((row) => row.sex))).map(
            (sex) => ({
              label: sex,
              value: sex,
            }),
          ),
        },
      ]
    : [];

  return (
    <DataGrid
      columns={epimapColumns}
      data={data || []}
      title="Epimap Chromatin States"
      description="Predicted chromatin states and regulatory elements across different tissues and developmental stages"
      searchPlaceholder="Search chromatin states..."
      facetedFilters={facetedFilters}
      onExport={exportTSV}
      exportFilename="epimap_data.tsv"
      initialPageSize={20}
      emptyState={{
        title: "No Epimap data",
        description: "No chromatin state data is available for this region.",
        icon: "database",
        dataType: "Epimap data",
      }}
    />
  );
}
