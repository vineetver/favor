"use client";

import { useMemo } from "react";
import { DataGrid } from "@/components/ui/data-grid";
import { vistaEnhancerColumns } from "@/lib/region/vista-enhancers/table-columns";
import type { VistaEnhancer } from "@/lib/region/vista-enhancers/types";

type VistaEnhancerTableProps = {
  data: VistaEnhancer[];
  title: string;
  description: string;
  isLoading?: boolean;
};

export function VistaEnhancerTable({
  data,
  title,
  description,
  isLoading = false,
}: VistaEnhancerTableProps) {
  const exportData = (data: VistaEnhancer[]) => {
    const headers = [
      "Element ID",
      "Chromosome", 
      "Start Position",
      "End Position",
      "Description",
      "Expression",
      "Tissues",
      "Stage",
      "Organism",
      "Promoter",
      "Transgenesis",
      "Genome Assembly"
    ];

    const rows = data.map((row) => [
      row.element_id || "N/A",
      row.chromosome || "N/A",
      row.start_position?.toString() || "N/A",
      row.end_position?.toString() || "N/A",
      row.element_description || "N/A",
      row.expression || "N/A",
      row.tissues || "N/A",
      row.stage || "N/A",
      row.organism || "N/A",
      row.promoter || "N/A",
      row.transgenesis || "N/A",
      row.genome_assembly || "N/A",
    ]);

    const tsv = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join(
      "\n",
    );
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vista_enhancers_${title.toLowerCase().replace(/\s+/g, "_")}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const facetedFilters = useMemo(() => [
    {
      columnId: "expression",
      title: "Expression",
      options: Array.from(new Set(data.map((item) => item.expression)))
        .filter(Boolean)
        .map((expression) => ({ label: expression, value: expression })),
    },
    {
      columnId: "organism",
      title: "Organism",
      options: Array.from(new Set(data.map((item) => item.organism)))
        .filter(Boolean)
        .map((organism) => ({ label: organism, value: organism })),
    },
    {
      columnId: "stage",
      title: "Developmental Stage",
      options: Array.from(new Set(data.map((item) => item.stage)))
        .filter(Boolean)
        .map((stage) => ({ label: stage, value: stage })),
    },
  ], [data]);

  return (
    <DataGrid
      columns={vistaEnhancerColumns}
      data={data}
      title={title}
      description={description}
      searchPlaceholder="Search elements, descriptions, tissues..."
      facetedFilters={facetedFilters}
      onExport={exportData}
      exportFilename={`vista_enhancers_${title.toLowerCase().replace(/\s+/g, "_")}.tsv`}
      initialPageSize={25}
      isLoading={isLoading}
      emptyState={{
        title: "No VISTA Enhancer Data",
        description:
          "No experimentally validated enhancer elements available for this region.",
        dataType: "VISTA Enhancer Data",
      }}
    />
  );
}