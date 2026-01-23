"use client";

import { BarChart } from "@shared/components/charts";
import type { GradientThreshold } from "@shared/components/charts/types";
import { DataSurface } from "@shared/components/ui/data-surface";
import type { VisualizationRow } from "@shared/components/ui/data-surface/types";
import {
  integrativeColumns,
  integrativeGroup,
} from "@features/variant/config/hg38/columns/integrative";
import type { Variant } from "@features/variant/types";

interface IntegrativeDataTableProps {
  variant: Variant;
}

// Clearer percentile gradient with significance labels
const SIGNIFICANCE_GRADIENT: GradientThreshold[] = [
  { max: 1, color: "#dc2626", label: "Highly Significant (<1%)" },
  { max: 5, color: "#ea580c", label: "Very Significant (1-5%)" },
  { max: 10, color: "#f59e0b", label: "Significant (5-10%)" },
  { max: 100, color: "#3b82f6", label: "Less Significant (>10%)" },
];

function IntegrativeVisualization({ data }: { data: VisualizationRow[] }) {
  return (
    <BarChart
      data={data.map((row) => ({
        id: row.id,
        label: row.label,
        value: typeof row.value === "number" ? row.value : null,
        derived: typeof row.derived === "number" ? row.derived : null,
      }))}
      colorScheme={{ type: "gradient", thresholds: SIGNIFICANCE_GRADIENT }}
      colorField="derived"
      showLegend
      valueFormatter={(v) => v.toFixed(4)}
    />
  );
}

export function IntegrativeDataTable({ variant }: IntegrativeDataTableProps) {
  return (
    <DataSurface<Variant, unknown>
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
