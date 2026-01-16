"use client";

import { DataTable } from "@/components/ui/data-table";
import { integrativeColumns, integrativeGroup } from "@/features/variant/config/hg38/columns/integrative";
import type { Variant } from "@/features/variant/types";

interface IntegrativeDataTableProps {
  variant: Variant;
}

export function IntegrativeDataTable({ variant }: IntegrativeDataTableProps) {
  return (
    <DataTable
      transposed
      columns={integrativeColumns}
      data={[]}
      sourceObject={variant}
      derivedColumn={integrativeGroup.derivedColumn}
      visualization={integrativeGroup.view?.visualization}
      defaultSort={integrativeGroup.defaultSort}
      searchable
      searchPlaceholder="Search annotations..."
      exportable
      exportFilename={`integrative-${variant.variant_vcf || "variant"}`}
    />
  );
}
