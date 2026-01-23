"use client";

import { DataSurface } from "@shared/components/ui/data-surface";
import { openTargetsL2GColumns } from "../../config/hg38/columns/open-targets-l2g";
import type { OpenTargetsL2GRow } from "../../types/opentargets";

interface L2GTableProps {
  data: OpenTargetsL2GRow[];
}

export function L2GTable({ data }: L2GTableProps) {
  return (
    <DataSurface
      data={data}
      columns={openTargetsL2GColumns}
      title="Locus2Gene (L2G) Scores"
      subtitle="Machine learning-based gene prioritization scores predicting causal genes at GWAS loci"
      searchPlaceholder="Search genes..."
      searchColumn="geneSymbol"
      exportable
      exportFilename="l2g-scores"
      defaultPageSize={10}
    />
  );
}
