"use client";

import { useMemo } from "react";
import { DataGrid } from "@/components/ui/data-grid";
import { pgboostGeneColumns, pgboostRegionColumns } from "./columns";
import type { PGBoost } from "@/lib/variant/pgboost/types";

interface PGBoostDisplayProps {
  data: PGBoost[] | null;
  entityId: string;
  entityType: "gene" | "region";
}

export function PGBoostDisplay({
  data,
  entityId,
  entityType,
}: PGBoostDisplayProps) {
  const columns =
    entityType === "gene" ? pgboostGeneColumns : pgboostRegionColumns;

  const exportData = (data: PGBoost[]) => {
    const headers = [
      entityType === "gene" ? "rsID" : "Gene",
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
      entityType === "gene" ? row.rsid || "N/A" : row.gene || "N/A",
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
    a.download = `pgboost_${entityType}_${entityId.toLowerCase().replace(/\s+/g, "_")}.tsv`;
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
      },
    ],
    [],
  );

  const title = `pgBoost Predictions - ${entityId}`;
  const description =
    entityType === "gene"
      ? "Variant-gene link predictions using pgBoost and other single-cell ATAC peak-gene linking scores"
      : "Variant-gene link predictions for this region using pgBoost and other single-cell ATAC peak-gene linking scores";
  const searchPlaceholder =
    entityType === "gene" ? "Search rsid..." : "Search genes...";

  return (
    <DataGrid
      columns={columns}
      data={data || []}
      title={title}
      description={description}
      searchPlaceholder={searchPlaceholder}
      facetedFilters={facetedFilters}
      onExport={exportData}
      exportFilename={`pgboost_${entityType}_${entityId.toLowerCase().replace(/\s+/g, "_")}.tsv`}
      initialPageSize={25}
      initialSorting={[{ id: "pg_boost_percentile", desc: true }]}
      emptyState={{
        title: "No PGBoost Data",
        description: `No variant-gene link predictions available for this ${entityType}.`,
        dataType: "PGBoost Data",
      }}
    />
  );
}
