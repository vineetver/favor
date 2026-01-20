"use client";

import { BarChart, REGULATORY_COLORS } from "@/components/charts";
import { DataSurface } from "@/components/ui/data-surface";
import type { VisualizationRow } from "@/components/ui/data-surface/types";
import {
  epigeneticsColumns,
  epigeneticsGroup,
} from "@/features/variant/config/hg38/columns/epigenetics";
import type { Variant } from "@/features/variant/types";
import { REGULATORY_STATE_MAP } from "@/features/variant/types";

interface EpigeneticsDataTableProps {
  variant: Variant;
}

function EpigeneticsVisualization({ data }: { data: VisualizationRow[] }) {
  // Transform data for chart
  const chartData = data
    .filter(
      (row) =>
        row.value !== null &&
        row.value !== undefined,
    )
    .map((row) => {
      const state = REGULATORY_STATE_MAP[row.id];
      return {
        id: row.id,
        label: row.label,
        value: typeof row.value === "number" ? row.value : null,
        category: state ?? undefined,
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
    <DataSurface<Variant, unknown>
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
