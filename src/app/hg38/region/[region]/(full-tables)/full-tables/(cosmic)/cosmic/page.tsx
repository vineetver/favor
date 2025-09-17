"use client";

import { useParams } from "next/navigation";
import { useMemo } from "react";
import { DataGrid } from "@/components/ui/data-grid";
import { useCosmicData } from "@/lib/region/cosmic/hooks";
import { cosmicColumns, type Cosmic } from "@/lib/region/cosmic/columns";

export default function RegionCosmicPage() {
  const { region } = useParams();
  const { data, isLoading, error } = useCosmicData(region as string);

  const facetedFilters = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Get unique mutation types
    const mutationTypes = Array.from(
      new Set(data.map((item) => item.so_term).filter(Boolean)),
    ).sort();

    // Get unique canonical values
    const canonicalValues = Array.from(
      new Set(data.map((item) => item.is_canonical).filter(Boolean)),
    ).sort();

    // Calculate sample count ranges
    const sampleCounts = data
      .map((item) => item.genome_screen_sample_count)
      .filter(Boolean);
    const maxCount = Math.max(...sampleCounts);

    return [
      {
        columnId: "is_canonical",
        title: "Canonical Transcript",
        options: canonicalValues.map((value) => ({
          label: value === "y" ? "Yes" : "No",
          value: value,
        })),
      },
      {
        columnId: "so_term",
        title: "Mutation Type",
        options: mutationTypes.map((type) => ({
          label: type,
          value: type,
        })),
      },
      {
        columnId: "genome_screen_sample_count",
        title: "Sample Count",
        options: [
          { label: "1 sample", value: "1" },
          ...(maxCount > 1 ? [{ label: "2-5 samples", value: "2-5" }] : []),
          ...(maxCount > 5 ? [{ label: "6-10 samples", value: "6-10" }] : []),
          ...(maxCount > 10 ? [{ label: "11+ samples", value: "11+" }] : []),
        ],
      },
    ].filter((filter) => filter.options.length > 0);
  }, [data]);

  const handleExport = (filteredData: Cosmic[]) => {
    const headers = cosmicColumns.map((col) => {
      if ("accessorKey" in col && col.accessorKey)
        return col.accessorKey.toString();
      return "column";
    });

    const rows = filteredData.map((row) =>
      cosmicColumns.map((col) => {
        if ("accessorKey" in col && col.accessorKey) {
          const value = (row as any)[col.accessorKey];
          return typeof value === "string" ? value : String(value || "");
        }
        return "";
      }),
    );

    const tsv = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join(
      "\n",
    );
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cosmic-region-${region}-${new Date().toISOString().split("T")[0]}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Error Loading COSMIC Data
          </h1>
          <p className="text-muted-foreground">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <DataGrid
        columns={cosmicColumns}
        data={data || []}
        isLoading={isLoading}
        title={`COSMIC Cancer Mutations - ${region}`}
        description="Cancer somatic mutations from the COSMIC database for this region"
        searchPlaceholder="Search mutations..."
        facetedFilters={facetedFilters}
        onExport={handleExport}
        exportFilename={`cosmic-region-${region}-${new Date().toISOString().split("T")[0]}.tsv`}
        initialPageSize={25}
        emptyState={{
          title: "No COSMIC data found",
          description: "No cancer mutations found for this region.",
          dataType: "mutations",
        }}
      />
    </div>
  );
}
