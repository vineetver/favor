"use client";

import { TableDataView } from "../table-data-view";
import { openTargetsPharmacogenomicsColumns } from "../../config/hg38/columns/open-targets-pharmacogenomics";
import type { OpenTargetsPharmacogenomicsRow } from "../../types/opentargets";

interface PharmacogenomicsTableProps {
  data: OpenTargetsPharmacogenomicsRow[];
}

export function PharmacogenomicsTable({ data }: PharmacogenomicsTableProps) {
  return (
    <TableDataView
      data={data}
      columns={openTargetsPharmacogenomicsColumns}
      title="Pharmacogenomics"
      description="Drug-gene interactions showing how this variant affects drug response"
      emptyMessage="No pharmacogenomics data available. This variant may not have known drug-gene interactions."
      searchPlaceholder="Search drugs or genes..."
      itemLabel="interaction"
      exportFilename="pharmacogenomics.csv"
      exportHeaders={[
        "Drug",
        "Drug ID",
        "Drug Type",
        "Target",
        "Target ID",
        "Category",
        "Evidence Level",
        "Phenotype",
        "Genotype",
        "Direct Target",
        "Consequence",
        "Study ID",
        "Literature",
      ]}
      exportRow={(r) => [
        r.drugName,
        r.drugId,
        r.drugType,
        r.targetSymbol,
        r.targetId,
        r.pgxCategory,
        r.evidenceLevel,
        r.phenotypeText,
        r.genotypeId,
        r.isDirectTarget,
        r.consequence,
        r.studyId,
        r.literature.join(";"),
      ]}
    />
  );
}
