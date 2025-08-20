"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  type ColumnFiltersState,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import type { Gene, Summary } from "@/lib/gene/types";
import { VariantTableColumns } from "./table-columns";
import { Loading } from "@/components/ui/loading";

export interface KeysetPaginationState {
  pageSize: number;
  cursor: string;
  previousCursors: string[];
  hasNextPage?: boolean;
  nextCursor?: string;
}

interface GeneDataTableProps {
  data: Gene[];
  isLoading: boolean;
  pagination: KeysetPaginationState;
  setPagination: React.Dispatch<React.SetStateAction<KeysetPaginationState>>;
  hasNextPage: boolean;
  nextCursor?: string;
  title?: string;
  description?: string;
  facetedFilters?: Summary;
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
  sorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
}

function fuzzyFilter(row: any, columnId: string, value: string) {
  const itemValue = row.getValue(columnId);
  const searchValue = String(value).toLowerCase();
  const cellValue = String(itemValue).toLowerCase();
  return cellValue.includes(searchValue);
}

export function GeneDataTable({
  data,
  isLoading,
  pagination,
  setPagination,
  hasNextPage,
  nextCursor,
  title = "Gene Variants",
  description = "Browse all variants for this gene",
  facetedFilters,
  columnFilters: externalColumnFilters,
  onColumnFiltersChange,
  sorting: externalSorting,
  onSortingChange,
}: GeneDataTableProps) {
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [internalColumnFilters, setInternalColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  
  const sorting = externalSorting ?? internalSorting;
  const columnFilters = externalColumnFilters ?? internalColumnFilters;

  const columns = useMemo(() => VariantTableColumns, []);


  const table = useReactTable({
    data: data ?? [],
    columns,
    rowCount: undefined,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      rowSelection,
    },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      if (onSortingChange) {
        onSortingChange(newSorting);
      } else {
        setInternalSorting(newSorting);
      }
    },
    onColumnVisibilityChange: setColumnVisibility,
    onColumnFiltersChange: (updater) => {
      const newFilters = typeof updater === 'function' ? updater(columnFilters) : updater;
      if (onColumnFiltersChange) {
        onColumnFiltersChange(newFilters);
      } else {
        setInternalColumnFilters(newFilters);
      }
    },
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualFiltering: !!onColumnFiltersChange,
    manualSorting: !!onSortingChange,
    manualPagination: true,
    filterFns: {
      fuzzy: fuzzyFilter,
    },
  });

  const nextPage = () => {
    if (hasNextPage && nextCursor) {
      setPagination((prev) => ({
        pageSize: prev.pageSize,
        cursor: nextCursor,
        previousCursors: [...prev.previousCursors, prev.cursor],
        hasNextPage: undefined,
        nextCursor: undefined,
      }));
    }
  };

  const previousPage = () => {
    setPagination((prev) => {
      const newPrev = [...prev.previousCursors];
      const prevCursor = newPrev.pop() || "";
      return {
        pageSize: prev.pageSize,
        cursor: prevCursor,
        previousCursors: newPrev,
        hasNextPage: undefined,
        nextCursor: undefined,
      };
    });
  };

  const exportTSV = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const dataToExport = selectedRows.length > 0 
      ? selectedRows.map(row => row.original)
      : data;

    const headers = columns
      .filter((col: any) => 'accessorKey' in col && col.accessorKey)
      .map((col: any) => col.accessorKey);
    
    const rows = dataToExport.map(row =>
      headers.map(header => {
        const value = (row as any)[header];
        return typeof value === 'string' ? value : String(value || '');
      })
    );

    const tsv = [headers.join('\t'), ...rows.map(row => row.join('\t'))].join('\n');
    const blob = new Blob([tsv], { type: 'text/tab-separated-values' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gene-variants-${new Date().toISOString().split('T')[0]}.tsv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Loading text="Loading variants..." size="lg" minHeight="400px" />
        </CardContent>
      </Card>
    );
  }


  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Toolbar content can be added here if needed */}
          </div>
          <Button variant="outline" size="sm" onClick={exportTSV}>
            <Download className="mr-2 h-4 w-4" />
            Export TSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-1">
          <Table className="table-auto">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
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
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No variants found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

        {/* Custom pagination for cursor-based navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-sm">
            <div className="text-sm text-muted-foreground text-center sm:text-left">
              Showing {data.length} variants
              {hasNextPage && " (more available)"}
            </div>
            {table.getFilteredSelectedRowModel().rows.length > 0 && (
              <Badge variant="secondary">
                {table.getFilteredSelectedRowModel().rows.length} of{" "}
                {table.getFilteredRowModel().rows.length} selected
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={previousPage}
              disabled={!pagination.previousCursors || pagination.previousCursors.length === 0}
              className="h-9 px-3"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={!hasNextPage}
              className="h-9 px-3"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}