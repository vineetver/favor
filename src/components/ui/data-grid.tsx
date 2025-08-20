"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  ColumnPinningState,
  ExpandedState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getExpandedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Download, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/pagination";
import { DataTableColumnToggle } from "@/components/ui/data-table-column-toggle";
import { DataTableFacetedFilter } from "@/components/ui/data-table-faceted-filter";
import { NoDataState } from "@/components/ui/error-states";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils/general";

interface DataGridProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  title?: string;
  description?: string;
  searchPlaceholder?: string;
  facetedFilters?: Array<{
    columnId: string;
    title: string;
    options: Array<{
      label: string;
      value: string;
      icon?: React.ComponentType<{ className?: string }>;
    }>;
  }>;
  onExport?: (data: TData[], filename?: string) => void;
  exportFilename?: string;
  initialPageSize?: number;
  initialSorting?: SortingState;
  showExport?: boolean;
  showColumnToggle?: boolean;
  showSearch?: boolean;
  emptyState?: {
    title?: string;
    description?: string;
    icon?: string;
    dataType?: string;
  };
  expandable?: boolean;
  renderExpandedRow?: (row: TData) => React.ReactNode;
  pinnedColumns?: {
    left?: string[];
    right?: string[];
  };
  isLoading?: boolean;
  onRowClick?: (row: TData) => void;
  selectedRowId?: string | number | null;
  getRowId?: (row: TData) => string | number;
  scrollToSelected?: boolean;
}

export function DataGrid<TData, TValue>({
  columns,
  data,
  title,
  description,
  searchPlaceholder = "Search...",
  facetedFilters = [],
  onExport,
  exportFilename = "data.csv",
  initialPageSize = 20,
  initialSorting = [],
  showExport = true,
  showColumnToggle = true,
  showSearch = true,
  emptyState,
  expandable = false,
  renderExpandedRow,
  pinnedColumns,
  isLoading = false,
  onRowClick,
  selectedRowId,
  getRowId,
  scrollToSelected = false,
}: DataGridProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [columnPinning, setColumnPinning] = useState<ColumnPinningState>(
    pinnedColumns ? pinnedColumns : {}
  );
  const selectedRowRef = useRef<HTMLTableRowElement>(null);

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: expandable ? getExpandedRowModel() : undefined,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onExpandedChange: expandable ? setExpanded : undefined,
    onColumnPinningChange: setColumnPinning,
    globalFilterFn: "includesString",
    getRowCanExpand: expandable ? () => true : undefined,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      expanded: expandable ? expanded : {},
      columnPinning,
    },
    initialState: {
      pagination: {
        pageSize: initialPageSize,
      },
    },
  });

  // Navigate to page containing selected row and scroll to it
  useEffect(() => {
    if (selectedRowId !== undefined && getRowId) {
      // Find the index of the selected row in the full dataset
      const selectedRowIndex = data.findIndex(row => getRowId(row) === selectedRowId);
      
      if (selectedRowIndex !== -1) {
        // Calculate which page the selected row is on
        const currentPageSize = table.getState().pagination.pageSize;
        const targetPage = Math.floor(selectedRowIndex / currentPageSize);
        const currentPage = table.getState().pagination.pageIndex;
        
        // Navigate to the correct page if not already there
        if (currentPage !== targetPage) {
          table.setPageIndex(targetPage);
        }
      }
    }
  }, [selectedRowId, data, getRowId, table]);

  // Scroll to selected row after page changes
  useEffect(() => {
    if (scrollToSelected && selectedRowId !== undefined && selectedRowRef.current) {
      // Use a small delay to ensure the page change and DOM update have completed
      const timeoutId = setTimeout(() => {
        selectedRowRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 150);
      
      return () => clearTimeout(timeoutId);
    }
  }, [table.getState().pagination.pageIndex, selectedRowId, scrollToSelected]);

  const handleExport = () => {
    if (onExport) {
      const filteredData = table.getFilteredRowModel().rows.map((row) => row.original);
      onExport(filteredData, exportFilename);
      return;
    }

    const headers = columns
      .filter((col) => col.header && typeof col.header === "string")
      .map((col) => col.header as string);
    
    const rows = table.getFilteredRowModel().rows.map((row) => 
      columns.map((col) => {
        if ("accessorKey" in col && col.accessorKey) {
          const value = row.getValue(col.accessorKey as string);
          return value?.toString() || "";
        }
        return "";
      })
    );

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
    ].join("\n");

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
        {(title || description || showSearch || showExport || showColumnToggle) && (
          <CardHeader>
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="space-y-1">
                {title && <CardTitle className="text-lg">{title}</CardTitle>}
                {description && <p className="text-sm text-muted-foreground">{description}</p>}
              </div>
              <div className="flex items-center space-x-2">
                {showExport && (
                  <Button variant="outline" size="sm" disabled>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                )}
                {showColumnToggle && <DataTableColumnToggle table={table} />}
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
                {Array.from({ length: Math.min(initialPageSize, 5) }).map((_, rowIndex) => (
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
      {(title || description || showSearch || showExport || showColumnToggle) && (
        <CardHeader>
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <div className="space-y-1">
              {title && <CardTitle className="text-lg">{title}</CardTitle>}
              {description && <p className="text-sm text-muted-foreground">{description}</p>}
            </div>
            <div className="flex items-center space-x-2">
              {showExport && (
                <Button variant="outline" size="sm" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              )}
              {showColumnToggle && <DataTableColumnToggle table={table} />}
            </div>
          </div>
          
          {(showSearch || facetedFilters.length > 0) && (
            <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
              {showSearch && (
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={searchPlaceholder}
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    className="pl-9 pr-9"
                  />
                  {globalFilter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2 p-0"
                      onClick={() => setGlobalFilter("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
              
              {facetedFilters.length > 0 && (
                <div className="flex flex-wrap items-center space-x-2">
                  {facetedFilters.map((filter) => (
                    <DataTableFacetedFilter
                      key={filter.columnId}
                      column={table.getColumn(filter.columnId)}
                      title={filter.title}
                      options={filter.options}
                    />
                  ))}
                  {table.getState().columnFilters.length > 0 && (
                    <Button
                      variant="ghost"
                      onClick={() => table.resetColumnFilters()}
                      className="h-8 px-2 lg:px-3"
                    >
                      Reset
                      <X className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
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
                            "sticky right-0 bg-card z-10 border-l border-border/50"
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const rowId = getRowId ? getRowId(row.original) : row.id;
                  const isSelected = selectedRowId !== undefined && rowId === selectedRowId;
                  return (
                  <React.Fragment key={row.id}>
                    <TableRow
                      ref={isSelected ? selectedRowRef : undefined}
                      data-state={(row.getIsSelected() || isSelected) && "selected"}
                      className={cn(
                        "hover:bg-muted/50 transition-colors cursor-pointer",
                        isSelected && "bg-blue-100 border-l-4 border-l-blue-500 shadow-md dark:bg-blue-900/40 dark:border-l-blue-400"
                      )}
                      onClick={() => onRowClick?.(row.original)}
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
                                "sticky right-0 bg-card z-10 border-l border-border/50"
                            )}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    {expandable && row.getIsExpanded() && renderExpandedRow && (
                      <TableRow key={`${row.id}-expanded`}>
                        <TableCell
                          colSpan={row.getVisibleCells().length}
                          className="bg-muted/10 p-6"
                        >
                          {renderExpandedRow(row.original)}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
                })
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
          
          <TablePagination table={table} />
      </CardContent>
    </Card>
  );
}