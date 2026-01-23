"use client";

import { DataSurface } from "@shared/components/ui/data-surface";
import { openTargetsPharmacogenomicsColumns } from "../../config/hg38/columns/open-targets-pharmacogenomics";
import type { OpenTargetsPharmacogenomicsRow } from "../../types/opentargets";

interface PharmacogenomicsTableProps {
  data: OpenTargetsPharmacogenomicsRow[];
}

export function PharmacogenomicsTable({ data }: PharmacogenomicsTableProps) {
  return (
    <DataSurface
      data={data}
      columns={openTargetsPharmacogenomicsColumns}
      title="Pharmacogenomics"
      subtitle="Drug-gene interactions showing how this variant affects drug response"
      searchPlaceholder="Search drugs or genes..."
      searchColumn="drugName"
      exportable
      exportFilename="pharmacogenomics"
      defaultPageSize={10}
    />
  );
}
