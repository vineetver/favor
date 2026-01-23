"use client";

import { DataSurface } from "@shared/components/ui/data-surface";
import { openTargetsEvidencesColumns } from "../../config/hg38/columns/open-targets-evidences";
import type { OpenTargetsEvidenceRow } from "../../types/opentargets";

interface EvidencesTableProps {
  data: OpenTargetsEvidenceRow[];
}

export function EvidencesTable({ data }: EvidencesTableProps) {
  return (
    <DataSurface
      data={data}
      columns={openTargetsEvidencesColumns}
      title="Disease Evidences"
      subtitle="Direct links between this variant and diseases/targets through various evidence sources"
      searchPlaceholder="Search diseases or targets..."
      searchColumn="diseaseName"
      exportable
      exportFilename="evidences"
      defaultPageSize={10}
    />
  );
}
