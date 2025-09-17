"use client";

import { useState, useEffect, useMemo } from "react";
import { ServerSideDataGrid } from "./server-side-data-grid";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";
// API routes for server-side data fetching
import { HG19GeneTableColumns } from "@/lib/hg19/gene/columns";
import { HG19RegionTableColumns } from "@/lib/hg19/region/columns";
import {
  hg19GenecodeCategory,
  hg19ExonicCategory,
  hg19SiftCategory,
  hg19ClinicalSignificance,
} from "@/lib/hg19/gene/full-tables/constants";

type HG19ServerSideDataTableType = "hg19-gene" | "hg19-region";

interface HG19ServerSideDataTableProps {
  type: HG19ServerSideDataTableType;
  entityId: string; // region string or gene name
  subcategory: string;
  title?: string;
  description?: string;
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: (filters: ColumnFiltersState) => void;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
}

interface ServerSideDataState {
  data: any[];
  loading: boolean;
  error: string | null;
  hasNextPage: boolean;
  nextCursor?: string;
  pageIndex: number;
  pageSize: number;
  summary?: any;
}

export function HG19ServerSideDataTable({
  type,
  entityId,
  subcategory,
  title = "Variants",
  description = "Browse variants with rsID",
  columnFilters,
  onColumnFiltersChange,
  sorting,
  onSortingChange,
}: HG19ServerSideDataTableProps) {
  const [serverState, setServerState] = useState<ServerSideDataState>({
    data: [],
    loading: true,
    error: null,
    hasNextPage: false,
    nextCursor: undefined,
    pageIndex: 0,
    pageSize: 25,
    summary: undefined,
  });

  const columns = useMemo(() => {
    return type === "hg19-gene" ? HG19GeneTableColumns : HG19RegionTableColumns;
  }, [type]);

  const facetedFilters = useMemo(() => {
    const summary = serverState.summary;

    // Only show filters that have data
    const filters = [];

    // Category filter - show if has data
    const categoryOptions = hg19GenecodeCategory
      .filter(
        (option) =>
          summary && summary[option.value] && summary[option.value] > 0,
      )
      .map((option) => ({
        ...option,
        count: summary[option.value],
      }));

    if (categoryOptions.length > 0) {
      filters.push({
        columnId: "gencode_category",
        title: "Category",
        options: categoryOptions,
      });
    }

    // Exonic Category filter - show if has data
    const exonicOptions = hg19ExonicCategory
      .filter(
        (option) =>
          summary && summary[option.value] && summary[option.value] > 0,
      )
      .map((option) => ({
        ...option,
        count: summary[option.value],
      }));

    if (exonicOptions.length > 0) {
      filters.push({
        columnId: "gencode_exonic_category",
        title: "Exonic Category",
        options: exonicOptions,
      });
    }

    // SIFT Category filter - show if has data
    const siftOptions = hg19SiftCategory
      .filter(
        (option) =>
          summary && summary[option.value] && summary[option.value] > 0,
      )
      .map((option) => ({
        ...option,
        count: summary[option.value],
      }));

    if (siftOptions.length > 0) {
      filters.push({
        columnId: "sift_cat",
        title: "SIFT Category",
        options: siftOptions,
      });
    }

    // Clinical Significance filter - show if has data
    const clinSigOptions = hg19ClinicalSignificance
      .filter(
        (option) =>
          summary && summary[option.value] && summary[option.value] > 0,
      )
      .map((option) => ({
        ...option,
        count: summary[option.value],
      }));

    if (clinSigOptions.length > 0) {
      filters.push({
        columnId: "clnsig",
        title: "Clinical Significance",
        options: clinSigOptions,
      });
    }

    return filters;
  }, [serverState.summary]);

  const fetchData = async (resetPagination = false) => {
    setServerState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      let result: any;
      let summary: Record<string, number> = {};

      if (type === "hg19-gene") {
        // Convert filter and sorting to hg19 format
        const filters = columnFilters.reduce(
          (acc, filter) => {
            acc[filter.id] = filter.value;
            return acc;
          },
          {} as Record<string, any>,
        );

        const sortField = sorting.length > 0 ? sorting[0].id : undefined;
        const sortDir =
          sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : "asc";

        // Fetch both table data and summary data in parallel via API routes
        const [tableResult, summaryResult] = await Promise.all([
          fetch(
            `/api/hg19/gene/${entityId}/variants?${new URLSearchParams({
              subcategory,
              pageSize: serverState.pageSize.toString(),
              cursor: resetPagination ? "" : serverState.nextCursor || "",
              sortingQuery: sortField ? `${sortField}:${sortDir}` : "",
              filtersQuery: Object.entries(filters)
                .map(([k, v]) => `${k}:${v}`)
                .join(","),
            })}`,
          ).then((res) => res.json()),
          // Fetch summary for the same subcategory to get filter counts
          fetch(
            `/api/hg19/gene/${entityId}/summary/${subcategory.replace("-table", "-summary")}`,
          ).then((res) => res.json()),
        ]);

        result = tableResult;
        // Transform summary array to object format for filter logic
        summary = summaryResult.reduce(
          (acc: Record<string, number>, item: any) => {
            acc[item.gencode_category] = item.count;
            return acc;
          },
          {},
        );
      } else if (type === "hg19-region") {
        // Convert filter and sorting to hg19 format
        const filters = columnFilters.reduce(
          (acc, filter) => {
            acc[filter.id] = filter.value;
            return acc;
          },
          {} as Record<string, any>,
        );

        const sortField = sorting.length > 0 ? sorting[0].id : undefined;
        const sortDir =
          sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : "asc";

        const [tableResult, summaryResult] = await Promise.all([
          fetch(
            `/api/hg19/region/${entityId}/variants?${new URLSearchParams({
              subcategory,
              pageSize: serverState.pageSize.toString(),
              cursor: resetPagination ? "" : serverState.nextCursor || "",
              sortingQuery: sortField ? `${sortField}:${sortDir}` : "",
              filtersQuery: Object.entries(filters)
                .map(([k, v]) => `${k}:${v}`)
                .join(","),
            })}`,
          ).then((res) => res.json()),
          fetch(
            `/api/hg19/region/${entityId}/summary/${subcategory.replace("-table", "-summary")}`,
          ).then((res) => res.json()),
        ]);

        result = tableResult;
        // Region summary returns an object, not an array like genes
        // Transform it to match the expected format for filter logic
        summary = summaryResult || {};
      } else {
        throw new Error(`Unsupported table type: ${type}`);
      }

      setServerState((prev) => ({
        ...prev,
        data: result.data,
        hasNextPage: result.hasNextPage,
        nextCursor: result.nextCursor,
        summary: summary,
        loading: false,
        error: null,
        pageIndex: resetPagination ? 0 : prev.pageIndex,
      }));
    } catch (err) {
      setServerState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to fetch data",
        data: [],
        hasNextPage: false,
        nextCursor: undefined,
        summary: undefined,
      }));
    }
  };

  const handlePaginationChange = (
    newPageIndex: number,
    newPageSize: number,
  ) => {
    setServerState((prev) => ({
      ...prev,
      pageIndex: newPageIndex,
      pageSize: newPageSize,
    }));

    // Fetch data for the new page
    setTimeout(() => fetchData(), 0);
  };

  useEffect(() => {
    // Reset pagination when filters or sorting change
    fetchData(true);
  }, [type, entityId, subcategory, columnFilters, sorting]);

  const handleExport = (data: any[], filename?: string) => {
    const headers = columns
      .filter((col: any) => "accessorKey" in col && col.accessorKey)
      .map((col: any) => col.accessorKey);

    const rows = data.map((row) =>
      headers.map((header: any) => {
        const value = (row as any)[header];
        return typeof value === "string" ? value : String(value || "");
      }),
    );

    const tsv = [headers.join("\t"), ...rows.map((row) => row.join("\t"))].join(
      "\n",
    );
    const blob = new Blob([tsv], { type: "text/tab-separated-values" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      filename ||
      `${type}-variants-${entityId}-${new Date().toISOString().split("T")[0]}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <ServerSideDataGrid
        columns={columns}
        data={serverState.data}
        title={title}
        description={description}
        isLoading={serverState.loading}
        facetedFilters={facetedFilters}
        onExport={handleExport}
        exportFilename={`hg19-${type}-variants-${entityId}.tsv`}
        emptyState={{
          title: "No variants found",
          description: "No variants match the current filters.",
        }}
        hasNextPage={serverState.hasNextPage}
        pageIndex={serverState.pageIndex}
        pageSize={serverState.pageSize}
        onPaginationChange={handlePaginationChange}
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        sorting={sorting}
        onSortingChange={onSortingChange}
      />
    </div>
  );
}
