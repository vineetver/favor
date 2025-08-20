"use client";

import { useMemo, useState } from "react";
import { DataGrid } from "@/components/ui/data-grid";
import { pgboostColumns } from "@/lib/variant/pgboost/table-columns";
import type { PGBoost } from "@/lib/variant/pgboost/types";

type PGBoostTableProps = {
  data: PGBoost[];
  title: string;
  description: string;
};

export function PGBoostTable({ data, title, description }: PGBoostTableProps) {
  const [sorting, setSorting] = useState([
    { id: "pg_boost_percentile", desc: true },
  ]);
  const exportData = (data: PGBoost[]) => {
    const headers = [
      "Gene",
      "pgBoost Score",
      "pgBoost Percentile",
      "SCENT Score",
      "Signac Score",
      "Cicero Score",
    ];

    const formatScore = (num: number | null | undefined) => {
      if (num == null || num === -1 || num === 1e-100) return "N/A";
      return num.toFixed(num < 0.01 ? 6 : 4);
    };

    const formatPercentile = (val: number | null | undefined) => {
      if (val == null) return "N/A";
      return (val * 100).toFixed(1) + "%";
    };

    const rows = data.map((row) => [
      row.gene || "N/A",
      formatScore(row.pg_boost),
      formatPercentile(row.pg_boost_percentile),
      formatScore(row.scent),
      formatScore(row.signac),
      formatScore(row.cicero),
    ]);

    const tsv = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join(
      "\n",
    );
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pgboost_${title.toLowerCase().replace(/\s+/g, "_")}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const facetedFilters = useMemo(
    () => [
      {
        columnId: "pg_boost_percentile",
        title: "High pgBoost",
        options: [
          { label: "Top 10%", value: "top10" },
          { label: "Top 25%", value: "top25" },
          { label: "Top 50%", value: "top50" },
        ],
        filterFn: (row: PGBoost, _columnId: string, value: string) => {
          const percentile = row.pg_boost_percentile;
          if (percentile == null) return false;

          switch (value) {
            case "top10":
              return percentile >= 0.9;
            case "top25":
              return percentile >= 0.75;
            case "top50":
              return percentile >= 0.5;
            default:
              return true;
          }
        },
      },
    ],
    [],
  );

  return (
    <DataGrid
      columns={pgboostColumns}
      data={data}
      title={title}
      description={description}
      searchPlaceholder="Search genes, rsid..."
      facetedFilters={facetedFilters}
      onExport={exportData}
      exportFilename={`pgboost_${title.toLowerCase().replace(/\s+/g, "_")}.tsv`}
      initialPageSize={25}
      initialSorting={[{ id: "pg_boost_percentile", desc: true }]}
      emptyState={{
        title: "No PGBoost Data",
        description:
          "No variant-gene link predictions available for this variant.",
        dataType: "PGBoost Data",
      }}
    />
  );
}
