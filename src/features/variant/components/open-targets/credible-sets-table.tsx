"use client";

import { TableDataView } from "../table-data-view";
import { openTargetsCredibleSetsColumns } from "../../config/hg38/columns/open-targets-credible-sets";
import type { OpenTargetsCredibleSetRow } from "../../types/opentargets";

interface CredibleSetsTableProps {
  data: OpenTargetsCredibleSetRow[];
}

export function CredibleSetsTable({ data }: CredibleSetsTableProps) {
  return (
    <TableDataView
      data={data}
      columns={openTargetsCredibleSetsColumns}
      title="Credible Sets"
      description="Fine-mapped GWAS associations where this variant appears in the credible set"
      emptyMessage="No credible sets found. This variant may not be associated with any fine-mapped GWAS studies."
      searchPlaceholder="Search traits or studies..."
      itemLabel="credible set"
      exportFilename="credible-sets.csv"
      exportHeaders={[
        "Study Locus ID",
        "Study ID",
        "Trait",
        "Study Type",
        "P-value",
        "Beta",
        "Confidence",
        "Method",
        "L2G Genes",
        "Variants",
        "Sample Size",
      ]}
      exportRow={(r) => [
        r.studyLocusId,
        r.studyId,
        r.traitFromSource,
        r.studyType,
        r.pValue,
        r.beta,
        r.confidence,
        r.finemappingMethod,
        r.l2gGeneCount,
        r.locusVariantCount,
        r.sampleSize,
      ]}
    />
  );
}
