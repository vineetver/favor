"use client";

import { TableDataView } from "../table-data-view";
import { openTargetsConsequencesColumns } from "../../config/hg38/columns/open-targets-consequences";
import type { OpenTargetsConsequenceRow } from "../../types/opentargets";

interface ConsequencesTableProps {
  data: OpenTargetsConsequenceRow[];
}

export function ConsequencesTable({ data }: ConsequencesTableProps) {
  return (
    <TableDataView
      data={data}
      columns={openTargetsConsequencesColumns}
      title="Transcript Consequences"
      description="Predicted variant consequences on transcripts from Open Targets via Ensembl VEP"
      emptyMessage="No transcript consequences found for this variant in Open Targets."
      searchPlaceholder="Search genes or transcripts..."
      itemLabel="transcript"
      exportFilename="consequences.csv"
      exportHeaders={[
        "Gene",
        "Gene ID",
        "Transcript",
        "Impact",
        "Consequence",
        "AA Change",
        "SIFT",
        "PolyPhen",
        "Canonical",
        "LOFTEE",
        "Codons",
      ]}
      exportRow={(r) => [
        r.approvedSymbol,
        r.targetId,
        r.transcriptId,
        r.impact,
        r.consequenceTerms,
        r.aminoAcidChange,
        r.siftPrediction,
        r.polyphenPrediction,
        r.isEnsemblCanonical,
        r.lofteePrediction,
        r.codons,
      ]}
    />
  );
}
