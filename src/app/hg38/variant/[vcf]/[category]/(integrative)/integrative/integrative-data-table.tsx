"use client";

import { DataSurface } from "@/components/ui/data-surface";
import { BarChart, PERCENTILE_GRADIENT } from "@/components/charts";
import { integrativeColumns, integrativeGroup } from "@/features/variant/config/hg38/columns/integrative";
import type { Variant } from "@/features/variant/types";
import type { VisualizationRow } from "@/components/ui/data-surface/types";

interface IntegrativeDataTableProps {
  variant: Variant;
}

function IntegrativeVisualization({ data }: { data: VisualizationRow[] }) {
  return (
    <BarChart
      data={data.map((row) => ({
        id: row.id,
        label: row.label,
        value: typeof row.value === "number" ? row.value : null,
        derived: typeof row.derived === "number" ? row.derived : null,
      }))}
      colorScheme={{ type: "gradient", thresholds: PERCENTILE_GRADIENT }}
      colorField="derived"
      showLegend
      valueFormatter={(v) => v.toFixed(4)}
    />
  );
}

export function IntegrativeDataTable({ variant }: IntegrativeDataTableProps) {
  return (
    <DataSurface
      transposed
      columns={integrativeColumns}
      data={[]}
      sourceObject={variant}
      derivedColumn={integrativeGroup.derivedColumn}
      visualization={IntegrativeVisualization}
      defaultSort={integrativeGroup.defaultSort}
      searchable
      searchPlaceholder="Search annotations..."
      exportable
      exportFilename={`integrative-${variant.variant_vcf || "variant"}`}
      showViewSwitch
    />
  );
}
