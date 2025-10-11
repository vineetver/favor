"use client";

import { useState, useEffect, useMemo } from "react";
import { ServerSideDataGrid } from "./server-side-data-grid";
import { VariantTableColumns } from "./table-columns";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { fetchRegionTableData } from "@/lib/region/table/api";
import { fetchRegionSummary } from "@/lib/region/summary/api";
import { fetchGeneTableData } from "@/lib/gene/table/api";
import { fetchGeneSummary, getSummaryByCategory } from "@/lib/gene/summary/api";
import {
  buildFiltersQuery,
  buildSortingQuery,
  extractNumericFilters,
} from "@/lib/utils/query";
import {
  genecodeCategory,
  clinsig,
  exonic_category,
  siftcat,
} from "@/lib/gene/full-tables/constants";

type ServerSideDataTableType = "region" | "gene";

interface ServerSideDataTableProps {
  type: ServerSideDataTableType;
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

export function ServerSideDataTable({
  type,
  entityId,
  subcategory,
  title = "Variants",
  description = "Browse variants",
  columnFilters,
  onColumnFiltersChange,
  sorting,
  onSortingChange,
}: ServerSideDataTableProps) {
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
    return VariantTableColumns;
  }, []);

  const facetedFilters = useMemo(() => {
    const summary = serverState.summary;

    // Only show filters that have data
    const filters = [];

    // Category filter - show if has data
    const categoryOptions = genecodeCategory
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
        columnId: "genecode_comprehensive_category",
        title: "Category",
        options: categoryOptions,
      });
    }

    // Exonic Category filter - show if has data
    const exonicOptions = exonic_category
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
        columnId: "genecode_comprehensive_exonic_category",
        title: "Exonic Category",
        options: exonicOptions,
      });
    }

    // SIFT Category filter - show if has data
    const siftOptions = siftcat
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
    const clinSigOptions = clinsig
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
        columnId: "clnsig_v2",
        title: "Clinical Significance",
        options: clinSigOptions,
      });
    }

    return filters;
  }, [serverState.summary]);

  const rangeFilters = useMemo(() => {
    return [
      {
        columnId: "cadd_phred",
        title: "CADD Phred",
        min: 0,
        max: 50,
        step: 0.1,
      },
      {
        columnId: "apc_conservation_v2",
        title: "aPC Conservation",
        min: 0,
        max: 50,
        step: 0.1,
      },
      {
        columnId: "apc_protein_function_v3",
        title: "aPC Protein Function",
        min: 0,
        max: 50,
        step: 0.1,
      },
      {
        columnId: "af_total",
        title: "Total AF",
        min: 0,
        max: 1,
        step: 0.0001,
        formatValue: (v: number) => v.toExponential(2),
      },
      {
        columnId: "bravo_af",
        title: "Bravo AF",
        min: 0,
        max: 1,
        step: 0.0001,
        formatValue: (v: number) => v.toExponential(2),
      },
    ];
  }, []);

  const fetchData = async (resetPagination = false) => {
    setServerState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const filtersQuery = buildFiltersQuery(columnFilters);
      const sortingQuery = buildSortingQuery(sorting);
      const numericFilters = extractNumericFilters(columnFilters);

      // Uncomment for debugging:
      // console.log("Filter Debug - columnFilters:", columnFilters);
      // console.log("Filter Debug - filtersQuery:", filtersQuery);
      // console.log("Filter Debug - numericFilters:", numericFilters);
      // console.log("Filter Debug - sortingQuery:", sortingQuery);

      let result;
      let summary;

      if (type === "region") {
        // Fetch both table data and summary data in parallel
        const [tableResult, summaryResult] = await Promise.all([
          fetchRegionTableData(entityId, {
            subcategory,
            filtersQuery,
            sortingQuery,
            numericFilters,
            pageSize: serverState.pageSize,
            cursor: resetPagination
              ? undefined
              : serverState.pageIndex > 0
                ? serverState.nextCursor
                : undefined,
          }),
          // Fetch summary for the same subcategory to get filter counts
          fetchRegionSummary(
            entityId,
            subcategory.replace("-table", "-summary"),
          ),
        ]);

        result = tableResult;
        summary = summaryResult;

        // Uncomment for debugging:
        // console.log("Filter Debug - summary data:", summary);
        // console.log("Filter Debug - table data sample:", result.data?.slice(0, 2));
      } else if (type === "gene") {
        // Fetch both table data and summary data in parallel
        const [tableResult, summaryResult] = await Promise.all([
          fetchGeneTableData(entityId, {
            subcategory,
            filtersQuery,
            sortingQuery,
            numericFilters,
            pageSize: serverState.pageSize,
            cursor: resetPagination
              ? undefined
              : serverState.pageIndex > 0
                ? serverState.nextCursor
                : undefined,
          }),
          // Fetch summary for the same subcategory to get filter counts
          fetchGeneSummary(entityId),
        ]);

        result = tableResult;
        // Extract summary for this subcategory
        summary = summaryResult
          ? getSummaryByCategory(
              summaryResult,
              subcategory.replace("-table", "-summary"),
            )
          : undefined;
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

  if (serverState.error) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Error Loading Data
          </h1>
          <p className="text-muted-foreground">{serverState.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ServerSideDataGrid
        columns={columns}
        data={serverState.data}
        title={title}
        description={description}
        isLoading={serverState.loading}
        facetedFilters={facetedFilters}
        rangeFilters={rangeFilters}
        onExport={handleExport}
        exportFilename={`${type}-variants-${entityId}.tsv`}
        emptyState={{
          title: "No variants found",
          description: "No variants match the current filters.",
          dataType: "variants",
        }}
        columnFilters={columnFilters}
        onColumnFiltersChange={onColumnFiltersChange}
        sorting={sorting}
        onSortingChange={onSortingChange}
        pageIndex={serverState.pageIndex}
        pageSize={serverState.pageSize}
        hasNextPage={serverState.hasNextPage}
        onPaginationChange={handlePaginationChange}
      />
    </div>
  );
}
