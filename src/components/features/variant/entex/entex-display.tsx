"use client";

import {
  ResponsiveTabs,
  type TabConfig,
} from "@/components/ui/responsive-tabs";
import { DataGrid } from "@/components/ui/data-grid";
import { useMemo } from "react";
import type { Entex } from "@/lib/variant/entex/api";
import {
  entexColumns,
  entexPooledColumns,
} from "@/lib/variant/entex/table-columns";

type EntexTableProps = {
  data: Entex[];
  title: string;
  description: string;
  isPooled?: boolean;
};

function EntexTable({
  data,
  title,
  description,
  isPooled = false,
}: EntexTableProps) {
  const tissues = useMemo(() => {
    return Array.from(new Set(data.map((e) => e.tissue))).sort();
  }, [data]);

  const facetedFilters = useMemo(() => {
    const filters = [
      {
        columnId: "imbalance_significance",
        title: "Significance",
        options: [
          { label: "Significant", value: "1" },
          { label: "Not Significant", value: "0" },
        ],
      },
    ];

    if (!isPooled) {
      filters.unshift({
        columnId: "tissue",
        title: "Tissue",
        options: tissues.map((tissue) => {
          const formatted = tissue
            .replace(/_/g, " ")
            .replace(/\b\w/g, (char) => char.toUpperCase());
          return {
            label: formatted,
            value: tissue,
          };
        }),
      });
    }

    return filters;
  }, [tissues, isPooled]);

  const exportData = (data: Entex[]) => {
    const headers = [
      "Tissue",
      "Read Counts",
      "Ref Ratio",
      "P-value",
      "Significance",
      "Donor",
      "Assay",
      "Experiment",
    ];
    const rows = data.map((row) => [
      row.tissue,
      `A:${row.ca} C:${row.cc} G:${row.cg} T:${row.ct}`,
      Number(row.ref_allele_ratio).toFixed(3),
      Number(row.p_betabinom).toExponential(3),
      row.imbalance_significance === 1 ? "Significant" : "Not Significant",
      row.donor,
      row.assay,
      row.experiment_accession,
    ]);
    const tsv = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join(
      "\n",
    );
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `entex_${title.toLowerCase().replace(/\s+/g, "_")}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DataGrid
      columns={isPooled ? entexPooledColumns : entexColumns}
      data={data}
      title={title}
      description={description}
      searchPlaceholder={
        isPooled
          ? "Search donor, experiment..."
          : "Search tissue, donor, experiment..."
      }
      facetedFilters={facetedFilters}
      onExport={exportData}
      exportFilename={`entex_${title.toLowerCase().replace(/\s+/g, "_")}.tsv`}
      pinnedColumns={{ right: ["details"] }}
      initialPageSize={25}
      emptyState={{
        title: "No ENTEx Data",
        description: "No allelic imbalance data available for this variant.",
        dataType: "ENTEx Data",
      }}
    />
  );
}

interface EntexDisplayProps {
  defaultData: Entex[] | null;
  pooledData: Entex[] | null;
}

export function EntexDisplay({ defaultData, pooledData }: EntexDisplayProps) {
  const tabs: TabConfig[] = [
    {
      id: "default",
      label: "Default Data",
      shortLabel: "Default",
      count: defaultData?.length || 0,
      content: (
        <EntexTable
          data={defaultData || []}
          title="ENTEx Default Analysis"
          description="Individual tissue-specific allelic imbalance analysis from ENTEx consortium"
        />
      ),
    },
    {
      id: "pooled",
      label: "Pooled Data",
      shortLabel: "Pooled",
      count: pooledData?.length || 0,
      content: (
        <EntexTable
          data={pooledData || []}
          title="ENTEx Pooled Analysis"
          description="Pooled cross-tissue allelic imbalance analysis from ENTEx consortium"
          isPooled={true}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <ResponsiveTabs tabs={tabs} defaultValue="default" />
    </div>
  );
}
