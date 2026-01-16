"use client";

import { DataTable } from "@/components/ui/data-table";
import { epigeneticsColumns, epigeneticsGroup } from "@/features/variant/config/hg38/columns/epigenetics";
import type { Variant } from "@/features/variant/types";

interface EpigeneticsDataTableProps {
  variant: Variant;
}

export function EpigeneticsDataTable({ variant }: EpigeneticsDataTableProps) {
  return (
    <DataTable
      transposed
      columns={epigeneticsColumns}
      data={[]}
      sourceObject={variant}
      derivedColumn={epigeneticsGroup.derivedColumn}
      visualization={epigeneticsGroup.view?.visualization}
      defaultSort={epigeneticsGroup.defaultSort}
      searchable
      searchPlaceholder="Search annotations..."
      exportable
      exportFilename={`epigenetics-${variant.variant_vcf || "variant"}`}
    />
  );
}
