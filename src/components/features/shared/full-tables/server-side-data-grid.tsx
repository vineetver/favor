"use client";

import * as React from "react";
import { useState } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  ColumnPinningState,
  ExpandedState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTableColumnToggle } from "@/components/ui/data-table-column-toggle";
import { DataTableRangeFilter } from "@/components/ui/data-table-range-filter";
import { ServerSideFacetedFilter } from "./server-side-faceted-filter";
import { NoDataState } from "@/components/ui/error-states";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/general";
import { Download, X, ChevronLeft, ChevronRight } from "lucide-react";

interface ServerSideDataGridProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  title?: string;
  description?: string;
  facetedFilters?: Array<{
    columnId: string;
    title: string;
    options: Array<{
      label: string;
      value: string;
      count?: number;
      icon?: React.ComponentType<{ className?: string }>;
    }>;
  }>;
  rangeFilters?: Array<{
    columnId: string;
    title: string;
    min: number;
    max: number;
    step?: number;
    formatValue?: (value: number) => string;
  }>;
  onExport?: (data: TData[], filename?: string) => void;
  exportFilename?: string;
  isLoading?: boolean;
  emptyState?: {
    title?: string;
    description?: string;
    icon?: string;
    dataType?: string;
  };
  // Server-side filter and sorting handlers
  columnFilters: ColumnFiltersState;
  onColumnFiltersChange: (filters: ColumnFiltersState) => void;
  sorting: SortingState;
  onSortingChange: (sorting: SortingState) => void;
  // Server-side pagination
  pageIndex: number;
  pageSize: number;
  hasNextPage?: boolean;
  onPaginationChange: (pageIndex: number, pageSize: number) => void;
}

export function ServerSideDataGrid<TData, TValue>({
  columns,
  data,
  title,
  description,
  facetedFilters = [],
  rangeFilters = [],
  onExport,
  exportFilename = "data.csv",
  isLoading = false,
  emptyState,
  columnFilters,
  onColumnFiltersChange,
  sorting,
  onSortingChange,
  pageIndex,
  pageSize,
  hasNextPage = false,
  onPaginationChange,
}: ServerSideDataGridProps<TData, TValue>) {
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>({});

  const table = useReactTable({
    data,
    columns,
    onSortingChange: (updaterOrValue) => {
      const newSorting =
        typeof updaterOrValue === "function"
          ? updaterOrValue(sorting)
          : updaterOrValue;
      // console.log("Filter Debug - Sorting changed:", newSorting);
      onSortingChange(newSorting);
    },
    onColumnFiltersChange: (updaterOrValue) => {
      const newFilters =
        typeof updaterOrValue === "function"
          ? updaterOrValue(columnFilters)
          : updaterOrValue;
      // console.log("Filter Debug - Filters changed:", newFilters);
      onColumnFiltersChange(newFilters);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onExpandedChange: setExpanded,
    onColumnPinningChange: setColumnPinning,
    // Server-side mode - disable client-side filtering/sorting
    manualFiltering: true,
    manualSorting: true,
    manualPagination: true,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      expanded,
      columnPinning,
    },
  });

  const handleExport = () => {
    if (onExport) {
      onExport(data, exportFilename);
      return;
    }

    // Default export logic
    const headers = columns
      .filter((col) => "accessorKey" in col && col.accessorKey)
      .map((col) => (col as any).accessorKey);

    const rows = data.map((row) =>
      headers.map((header) => {
        const value = (row as any)[header];
        return value?.toString() || "";
      }),
    );

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", exportFilename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle loading state
  if (isLoading) {
    return (
      <Card>
        {(title || description || facetedFilters.length > 0) && (
          <CardHeader>
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="space-y-1">
                {title && <CardTitle className="text-lg">{title}</CardTitle>}
                {description && (
                  <p className="text-sm text-muted-foreground">{description}</p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" disabled>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                <DataTableColumnToggle table={table} />
              </div>
            </div>
          </CardHeader>
        )}
        <CardContent className="grid grid-cols-1">
          <div className="overflow-x-auto">
            <Table className="table-auto">
              <TableHeader>
                <TableRow>
                  {columns.map((_, index) => (
                    <TableHead key={index}>
                      <Skeleton className="h-4 w-20" />
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: Math.min(5, 5) }).map((_, rowIndex) => (
                  <TableRow key={rowIndex}>
                    {columns.map((_, colIndex) => (
                      <TableCell key={colIndex}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <NoDataState
            title={emptyState?.title || "No data found"}
            description={emptyState?.description || "No data is available."}
            categoryName={emptyState?.dataType || "data"}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {(title || description || facetedFilters.length > 0) && (
        <CardHeader>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="space-y-1">
              {title && <CardTitle className="text-lg">{title}</CardTitle>}
              {description && (
                <p className="text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <DataTableColumnToggle table={table} />
            </div>
          </div>

          {(facetedFilters.length > 0 || rangeFilters.length > 0) && (
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
              <div className="flex flex-wrap items-center gap-2">
                {facetedFilters.map((filter) => (
                  <ServerSideFacetedFilter
                    key={filter.columnId}
                    column={table.getColumn(filter.columnId)}
                    title={filter.title}
                    options={filter.options}
                  />
                ))}
                {rangeFilters.map((filter) => {
                  const column = table.getColumn(filter.columnId);
                  return (
                    <DataTableRangeFilter
                      key={filter.columnId}
                      column={
                        column
                          ? {
                              getFilterValue: () =>
                                column.getFilterValue() as
                                  | [number, number]
                                  | undefined,
                              setFilterValue: (
                                value: [number, number] | undefined,
                              ) => column.setFilterValue(value),
                            }
                          : undefined
                      }
                      title={filter.title}
                      min={filter.min}
                      max={filter.max}
                      step={filter.step}
                      formatValue={filter.formatValue}
                    />
                  );
                })}
                {columnFilters.length > 0 && (
                  <Button
                    variant="ghost"
                    onClick={() => onColumnFiltersChange([])}
                    className="h-8 px-2 lg:px-3"
                  >
                    Reset
                    <X className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardHeader>
      )}

      <CardContent className="grid grid-cols-1">
        <div className="overflow-x-auto">
          <Table className="table-auto">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const isPinned = header.column.getIsPinned();
                    return (
                      <TableHead
                        key={header.id}
                        className={cn(
                          isPinned === "left" &&
                            "sticky left-0 bg-card z-10 border-r border-border/50",
                          isPinned === "right" &&
                            "sticky right-0 bg-card z-10 border-l border-border/50",
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-muted/50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isPinned = cell.column.getIsPinned();
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            isPinned === "left" &&
                              "sticky left-0 bg-card z-10 border-r border-border/50",
                            isPinned === "right" &&
                              "sticky right-0 bg-card z-10 border-l border-border/50",
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Server-side Pagination */}
      <div className="flex items-center justify-between px-6 py-4 border-t">
        <div className="text-sm text-muted-foreground">
          Page {pageIndex + 1} • {data.length} rows
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onPaginationChange(Math.max(0, pageIndex - 1), pageSize)
            }
            disabled={pageIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPaginationChange(pageIndex + 1, pageSize)}
            disabled={!hasNextPage}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </Card>
  );
}
