"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { ContextHeader } from "./context-header";
import { ScopeBar } from "./scope-bar";
import { ControlBar } from "./control-bar";
import { TableContent } from "./table-content";
import { FooterBar } from "./footer-bar";
import { FilterDrawer } from "./filter-drawer";
import { LoadingState, ErrorState } from "./states";
import type { DataSurfaceProps, ViewMode } from "./types";

export function DataSurface<TData, TValue>({
  columns,
  data,
  title,
  subtitle,
  icon,
  headerActions,
  searchPlaceholder = "Search...",
  searchColumn,
  searchable = true,
  showViewSwitch = false,
  visualization: Visualization,
  defaultViewMode = "table",
  dimensions,
  filters = [],
  filterable = false,
  filterValues = {},
  onFilterChange,
  filterChips = [],
  onRemoveFilterChip,
  onClearFilters,
  exportable = true,
  exportFilename = "export",
  onExport,
  pageSizeOptions = [10, 20, 50, 100],
  defaultPageSize = 10,
  onRowClick,
  emptyMessage = "No data found",
  loading = false,
  error,
  onRetry,
  stickyHeader = false,
  className,
}: DataSurfaceProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [viewMode, setViewMode] = React.useState<ViewMode>(defaultViewMode);
  const [filterDrawerOpen, setFilterDrawerOpen] = React.useState(false);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: defaultPageSize },
    },
  });

  const handleSearch = (value: string) => {
    if (searchColumn) {
      table.getColumn(searchColumn)?.setFilterValue(value);
    } else {
      setGlobalFilter(value);
    }
  };

  const searchValue = searchColumn
    ? (table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""
    : globalFilter;

  const handleExport = () => {
    if (onExport) {
      onExport();
      return;
    }

    const headers = columns
      .filter((col) => col.id !== "actions")
      .map((col) => {
        if (typeof col.header === "string") return col.header;
        if ("accessorKey" in col) return String(col.accessorKey);
        return col.id ?? "";
      });

    const rows = table.getFilteredRowModel().rows.map((row) =>
      columns
        .filter((col) => col.id !== "actions")
        .map((col) => {
          const value = row.getValue(col.id ?? ("accessorKey" in col ? String(col.accessorKey) : ""));
          return `"${String(value ?? "").replace(/"/g, '""')}"`;
        })
        .join(",")
    );

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportFilename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasFilters = filterChips.length > 0 || Object.values(filterValues).some((v) => v);

  return (
    <div className={cn("bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden", className)}>
      {/* Context Header */}
      {(title || icon) && (
        <ContextHeader
          title={title ?? ""}
          subtitle={subtitle}
          icon={icon}
          actions={
            <div className="flex items-center gap-2">
              {headerActions}
              {exportable && (
                <button
                  type="button"
                  onClick={handleExport}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Export"
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
            </div>
          }
        />
      )}

      {/* Scope Bar */}
      {dimensions && dimensions.length > 0 && <ScopeBar dimensions={dimensions} />}

      {/* Control Bar */}
      <ControlBar
        searchPlaceholder={searchPlaceholder}
        searchValue={searchValue}
        onSearchChange={searchable ? handleSearch : undefined}
        showSearch={searchable}
        onFilterClick={filterable ? () => setFilterDrawerOpen(true) : undefined}
        hasActiveFilters={hasFilters}
        filterChips={filterChips}
        onRemoveFilterChip={onRemoveFilterChip}
        onClearFilters={onClearFilters}
        viewMode={viewMode}
        onViewModeChange={showViewSwitch ? setViewMode : undefined}
        showViewSwitch={showViewSwitch && !!Visualization}
        sticky={stickyHeader}
      />

      {/* Content */}
      {error ? (
        <ErrorState error={error} onRetry={onRetry} />
      ) : loading ? (
        <LoadingState columns={columns.length} />
      ) : viewMode === "chart" && Visualization ? (
        <div className="p-6">
          <Visualization data={table.getFilteredRowModel().rows.map((r) => r.original)} />
        </div>
      ) : (
        <TableContent
          table={table}
          onRowClick={onRowClick}
          emptyMessage={emptyMessage}
          loading={false}
        />
      )}

      {/* Footer */}
      {!error && !loading && table.getRowModel().rows.length > 0 && (
        <FooterBar table={table} pageSizeOptions={pageSizeOptions} />
      )}

      {/* Filter Drawer */}
      {filterable && (
        <FilterDrawer
          open={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
          filters={filters}
          filterValues={filterValues}
          onFilterChange={onFilterChange ?? (() => {})}
        />
      )}
    </div>
  );
}
