"use client";

import { TableDataView } from "../table-data-view";
import { openTargetsVariantEffectsColumns } from "../../config/hg38/columns/open-targets-variant-effects";
import type { OpenTargetsVariantEffectRow } from "../../types/opentargets";

interface VariantEffectsTableProps {
  data: OpenTargetsVariantEffectRow[];
}

export function VariantEffectsTable({ data }: VariantEffectsTableProps) {
  return (
    <TableDataView
      data={data}
      columns={openTargetsVariantEffectsColumns}
      title="Pathogenicity Predictions"
      description="Variant effect predictions from multiple methods (CADD, AlphaMissense, SIFT, etc.)"
      emptyMessage="No pathogenicity predictions available for this variant."
      searchPlaceholder="Search methods..."
      itemLabel="prediction"
      exportFilename="variant-effects.csv"
      exportHeaders={[
        "Method",
        "Assessment",
        "Raw Score",
        "Normalised Score",
        "Flag",
        "Target",
        "Target ID",
      ]}
      exportRow={(r) => [
        r.method,
        r.assessment,
        r.score,
        r.normalisedScore,
        r.assessmentFlag,
        r.targetSymbol,
        r.targetId,
      ]}
    />
  );
}
