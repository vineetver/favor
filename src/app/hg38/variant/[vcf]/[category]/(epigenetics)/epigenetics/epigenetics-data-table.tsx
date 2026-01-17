"use client";

import { DataSurface } from "@/components/ui/data-surface";
import { BarChart, REGULATORY_COLORS } from "@/components/charts";
import { epigeneticsColumns, epigeneticsGroup } from "@/features/variant/config/hg38/columns/epigenetics";
import { REGULATORY_STATE_MAP } from "@/features/variant/types";
import type { Variant } from "@/features/variant/types";
import type { VisualizationRow } from "@/components/ui/data-surface/types";

interface EpigeneticsDataTableProps {
  variant: Variant;
}

// IDs to exclude from chart (different scales)
const EXCLUDED_IDS = new Set(["gc", "cpg", "encodetotal_rna_sum"]);

function EpigeneticsVisualization({ data }: { data: VisualizationRow[] }) {
  // Transform data for chart, filtering out different-scale metrics
  const chartData = data
    .filter((row) => row.value !== null && row.value !== undefined && !EXCLUDED_IDS.has(row.id))
    .map((row) => {
      const state = REGULATORY_STATE_MAP[row.id] ?? null;
      return {
        id: row.id,
        label: row.label,
        value: typeof row.value === "number" ? row.value : null,
        category: state,
      };
    });

  return (
    <BarChart
      data={chartData}
      colorScheme={{ type: "categorical", colors: REGULATORY_COLORS }}
      colorField="category"
      showLegend
      valueFormatter={(v) => v.toFixed(3)}
    />
  );
}

export function EpigeneticsDataTable({ variant }: EpigeneticsDataTableProps) {
  return (
    <DataSurface
      transposed
      columns={epigeneticsColumns}
      data={[]}
      sourceObject={variant}
      derivedColumn={epigeneticsGroup.derivedColumn}
      visualization={EpigeneticsVisualization}
      defaultSort={epigeneticsGroup.defaultSort}
      searchable
      searchPlaceholder="Search annotations..."
      exportable
      exportFilename={`epigenetics-${variant.variant_vcf || "variant"}`}
      showViewSwitch
    />
  );
}
