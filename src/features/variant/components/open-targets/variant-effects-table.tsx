"use client";

import { DataSurface } from "@shared/components/ui/data-surface";
import { openTargetsVariantEffectsColumns } from "../../config/hg38/columns/open-targets-variant-effects";
import type { OpenTargetsVariantEffectRow } from "../../types/opentargets";

interface VariantEffectsTableProps {
  data: OpenTargetsVariantEffectRow[];
}

export function VariantEffectsTable({ data }: VariantEffectsTableProps) {
  return (
    <DataSurface
      data={data}
      columns={openTargetsVariantEffectsColumns}
      title="Pathogenicity Predictions"
      subtitle="Variant effect predictions from multiple methods (CADD, AlphaMissense, SIFT, etc.)"
      searchPlaceholder="Search methods..."
      searchColumn="method"
      exportable
      exportFilename="variant-effects"
      defaultPageSize={10}
    />
  );
}
