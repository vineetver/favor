"use client";

import { TableDataView } from "../table-data-view";
import { openTargetsProteinCodingColumns } from "../../config/hg38/columns/open-targets-protein-coding";
import type { OpenTargetsProteinCodingRow } from "../../types/opentargets";

interface ProteinCodingTableProps {
  data: OpenTargetsProteinCodingRow[];
}

export function ProteinCodingTable({ data }: ProteinCodingTableProps) {
  return (
    <TableDataView
      data={data}
      columns={openTargetsProteinCodingColumns}
      title="Protein Impact"
      description="Protein-level impact with linked diseases and therapeutic areas"
      emptyMessage="No protein coding coordinates found for this variant."
      searchPlaceholder="Search genes or diseases..."
      itemLabel="coordinate"
      exportFilename="protein-impact.csv"
      exportHeaders={[
        "Gene",
        "Gene ID",
        "AA Change",
        "Position",
        "Effect Score",
        "Therapeutic Areas",
        "Diseases",
        "UniProt",
        "Consequences",
      ]}
      exportRow={(r) => [
        r.targetSymbol,
        r.targetId,
        `${r.referenceAminoAcid}${r.aminoAcidPosition}${r.alternateAminoAcid}`,
        r.aminoAcidPosition,
        r.variantEffect,
        r.therapeuticAreas.join(";"),
        r.diseases.join(";"),
        r.uniprotAccessions.join(";"),
        r.consequences,
      ]}
    />
  );
}
