"use client";

import { DataSurface } from "@shared/components/ui/data-surface";
import { openTargetsCredibleSetsColumns } from "../../config/hg38/columns/open-targets-credible-sets";
import type { OpenTargetsCredibleSetRow } from "../../types/opentargets";

interface CredibleSetsTableProps {
  data: OpenTargetsCredibleSetRow[];
}

export function CredibleSetsTable({ data }: CredibleSetsTableProps) {
  return (
    <DataSurface
      data={data}
      columns={openTargetsCredibleSetsColumns}
      title="Credible Sets"
      subtitle="Fine-mapped GWAS associations where this variant appears in the credible set"
      searchPlaceholder="Search traits or studies..."
      searchColumn="traitFromSource"
      exportable
      exportFilename="credible-sets"
      defaultPageSize={10}
    />
  );
}
