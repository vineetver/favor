"use client";

import { openTargetsEvidencesColumns } from "../../config/hg38/columns/open-targets-evidences";
import type { OpenTargetsEvidenceRow } from "../../types/opentargets";
import { TableDataView } from "../table-data-view";

interface EvidencesTableProps {
  data: OpenTargetsEvidenceRow[];
}

export function EvidencesTable({ data }: EvidencesTableProps) {
  return (
    <TableDataView
      data={data}
      columns={openTargetsEvidencesColumns}
      title="Disease Evidences"
      description="Direct links between this variant and diseases/targets through various evidence sources"
      emptyMessage="No disease evidences found for this variant."
      searchPlaceholder="Search diseases or targets..."
      itemLabel="evidence"
      defaultSort={{ id: "score", desc: true }}
      exportFilename="evidences.csv"
      exportHeaders={[
        "Disease",
        "Disease ID",
        "Target",
        "Target ID",
        "Score",
        "Source",
        "Type",
        "Effect",
        "Consequence",
        "Therapeutic Areas",
        "Sample Size",
      ]}
      exportRow={(r) => [
        r.diseaseName,
        r.diseaseId,
        r.targetSymbol,
        r.targetId,
        r.score,
        r.datasourceId,
        r.datatypeId,
        r.variantEffect,
        r.consequence,
        r.therapeuticAreas.join(";"),
        r.sampleSize,
      ]}
    />
  );
}
