"use client";

import { DataSurface } from "@shared/components/ui/data-surface";
import { openTargetsConsequencesColumns } from "../../config/hg38/columns/open-targets-consequences";
import type { OpenTargetsConsequenceRow } from "../../types/opentargets";

interface ConsequencesTableProps {
  data: OpenTargetsConsequenceRow[];
}

export function ConsequencesTable({ data }: ConsequencesTableProps) {
  return (
    <DataSurface
      data={data}
      columns={openTargetsConsequencesColumns}
      title="Transcript Consequences"
      subtitle="Predicted variant consequences on transcripts from Open Targets via Ensembl VEP"
      searchPlaceholder="Search genes or transcripts..."
      searchColumn="approvedSymbol"
      exportable
      exportFilename="consequences"
      defaultPageSize={10}
    />
  );
}
