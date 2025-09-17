"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { HG19ServerSideDataTable } from "@/components/features/shared/full-tables/hg19-server-side-data-table";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";

const VALID_SUBCATEGORIES = ["SNV-table", "InDel-table"];

export default function RegionTablePage() {
  const { region, subcategory } = useParams();
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);

  if (!VALID_SUBCATEGORIES.includes(subcategory as string)) {
    notFound();
  }

  const displayTitle = useMemo(() => {
    switch (subcategory) {
      case "SNV-table":
        return "SNV Variants";
      case "InDel-table":
        return "InDel Variants";
      default:
        return "Variants";
    }
  }, [subcategory]);

  const displayDescription = useMemo(() => {
    switch (subcategory) {
      case "SNV-table":
        return "Single nucleotide variants with rsID in this region from hg19";
      case "InDel-table":
        return "Insertion and deletion variants with rsID in this region from hg19";
      default:
        return "Browse all variants with rsID in this region from hg19";
    }
  }, [subcategory]);

  return (
    <div className="container mx-auto space-y-6">
      <HG19ServerSideDataTable
        type="hg19-region"
        entityId={region as string}
        subcategory={subcategory as string}
        title={`${displayTitle} - ${region}`}
        description={displayDescription}
        columnFilters={columnFilters}
        onColumnFiltersChange={setColumnFilters}
        sorting={sorting}
        onSortingChange={setSorting}
      />
    </div>
  );
}
