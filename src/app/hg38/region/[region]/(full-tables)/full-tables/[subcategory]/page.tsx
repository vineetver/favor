"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { GeneDataTable } from "@/components/features/gene/full-tables/gene-data-table";
import { fetchRegionTableData } from "@/lib/region/api";
import type { RegionVariant, Summary } from "@/lib/region/types";
import type { KeysetPaginationState } from "@/components/features/gene/full-tables/gene-data-table";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";

const VALID_SUBCATEGORIES = ["SNV-table", "InDel-table"];

export default function RegionTablePage() {
  const { region, subcategory } = useParams();
  const [data, setData] = useState<RegionVariant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  
  const [pagination, setPagination] = useState<KeysetPaginationState>({
    pageSize: 25,
    cursor: "",
    previousCursors: [],
  });

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

  useEffect(() => {
    const fetchData = async () => {
      if (!region || !subcategory) return;

      setIsLoading(true);
      setError(null);

      try {
        // Build filters query
        const filtersQuery = new URLSearchParams();
        columnFilters.forEach((filter) => {
          if (Array.isArray(filter.value)) {
            filter.value.forEach((value) => {
              filtersQuery.append(filter.id, value);
            });
          } else if (filter.value) {
            filtersQuery.set(filter.id, String(filter.value));
          }
        });

        // Build sorting query
        const sortingQuery = new URLSearchParams();
        sorting.forEach((sort) => {
          const direction = sort.desc ? "desc" : "asc";
          sortingQuery.set("sort", `${sort.id}:${direction}`);
        });

        const result = await fetchRegionTableData(region as string, {
          subcategory: subcategory as string,
          filtersQuery: filtersQuery.toString(),
          sortingQuery: sortingQuery.toString(),
          pageSize: pagination.pageSize,
          cursor: pagination.cursor || undefined,
        });

        setData(result.data);
        setHasNextPage(result.hasNextPage);
        setNextCursor(result.nextCursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
        setData([]);
        setHasNextPage(false);
        setNextCursor(undefined);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [region, subcategory, pagination.cursor, pagination.pageSize, columnFilters, sorting]);

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Data</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6">
      <GeneDataTable
        data={data}
        isLoading={isLoading}
        pagination={pagination}
        setPagination={setPagination}
        hasNextPage={hasNextPage}
        nextCursor={nextCursor}
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