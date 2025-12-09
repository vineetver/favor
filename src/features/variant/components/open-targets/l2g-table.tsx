"use client";

import { TableDataView } from "../table-data-view";
import { openTargetsL2GColumns } from "../../config/hg38/columns/open-targets-l2g";
import type { OpenTargetsL2GRow } from "../../types/opentargets";

interface L2GTableProps {
  data: OpenTargetsL2GRow[];
}

export function L2GTable({ data }: L2GTableProps) {
  return (
    <TableDataView
      data={data}
      columns={openTargetsL2GColumns}
      title="Locus2Gene (L2G) Scores"
      description="Machine learning-based gene prioritization scores predicting causal genes at GWAS loci"
      emptyMessage="No L2G scores available. This variant may not be associated with any GWAS studies in Open Targets."
      searchPlaceholder="Search genes..."
      itemLabel="gene"
      defaultSort={{ id: "score", desc: true }}
      exportFilename="l2g-scores.csv"
      exportHeaders={["Gene", "Gene ID", "L2G Score", "Trait", "Study Type", "Confidence", "Study ID"]}
      exportRow={(r) => [
        r.geneSymbol,
        r.geneId,
        r.score,
        r.traitFromSource,
        r.studyType,
        r.confidence,
        r.studyId,
      ]}
    />
  );
}
