"use client";

import { useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { ServerSideDataTable } from "@/components/features/shared/full-tables/server-side-data-table";
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
        return "Single nucleotide variants in this region";
      case "InDel-table":
        return "Insertion and deletion variants in this region";
      default:
        return "Browse all variants in this region";
    }
  }, [subcategory]);



  return (
    <div className="container mx-auto space-y-6">
      <ServerSideDataTable
        type="region"
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