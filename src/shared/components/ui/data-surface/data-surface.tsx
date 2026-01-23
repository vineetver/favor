"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Download, Info } from "lucide-react";
import * as React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import { cn } from "@infra/utils";
import { ContextHeader } from "./context-header";
import { ControlBar } from "./control-bar";
import { FilterDrawer } from "./filter-drawer";
import { FooterBar } from "./footer-bar";
import { ScopeBar } from "./scope-bar";
import { ErrorState, LoadingState } from "./states";
import { TableContent } from "./table-content";
import type {
  ColumnMeta,
  DataSurfaceProps,
  TransposedRow,
  ViewMode,
  VisualizationProps,
} from "./types";

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
  // Transposed mode props
  transposed = false,
  sourceObject,
  derivedColumn,
  defaultSort,
}: DataSurfaceProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>(
    defaultSort
      ? [{ id: defaultSort.column, desc: defaultSort.direction === "desc" }]
      : [],
  );
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [viewMode, setViewMode] = React.useState<ViewMode>(defaultViewMode);
  const [filterDrawerOpen, setFilterDrawerOpen] = React.useState(false);

  // ============================================================================
  // Transposed Mode Logic
  // ============================================================================

  // Transform columns to rows for transposed mode
  const transposedRows = React.useMemo<TransposedRow[]>(() => {
    if (!transposed || !sourceObject) return [];

    return columns.map((colDef) => {
      const header =
        typeof colDef.header === "string" ? colDef.header : (colDef.id ?? "");
      let value: unknown = null;

      if ("accessorFn" in colDef && typeof colDef.accessorFn === "function") {
        value = colDef.accessorFn(sourceObject, 0);
      } else if ("accessorKey" in colDef && colDef.accessorKey) {
        value = (sourceObject as Record<string, unknown>)[
          colDef.accessorKey as string
        ];
      }

      const meta = colDef.meta as ColumnMeta | undefined;
      const derived = derivedColumn?.derive(value, colDef.id);

      return {
        id: colDef.id ?? header,
        label: header,
        value,
        derived,
        description: meta?.description,
        columnDef: colDef as ColumnDef<unknown>,
        sourceObject,
      };
    });
  }, [transposed, sourceObject, columns, derivedColumn]);

  // Create table columns for transposed mode
  const transposedTableColumns = React.useMemo<
    ColumnDef<TransposedRow>[]
  >(() => {
    if (!transposed) return [];

    const cols: ColumnDef<TransposedRow>[] = [
      {
        id: "label",
        accessorKey: "label",
        header: "Annotation",
        enableSorting: true,
        cell: ({ row }) => {
          const { label, description } = row.original;
          return (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">
                {label}
              </span>
              {description && (
                <TooltipProvider>
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <span className="inline-flex">
                        <Info className="h-3.5 w-3.5 cursor-help shrink-0 text-slate-300 hover:text-slate-500 transition-colors" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs text-sm">
                      {description}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          );
        },
        filterFn: (row, _columnId, filterValue) => {
          return row.original.label
            .toLowerCase()
            .includes((filterValue as string).toLowerCase());
        },
      },
      {
        id: "value",
        accessorKey: "value",
        header: "Value",
        enableSorting: true,
        cell: ({ row }) => {
          const { columnDef, sourceObject: src, value } = row.original;
          if (columnDef.cell && typeof columnDef.cell === "function") {
            const ctx = {
              getValue: () => value,
              row: { original: src, id: "0", index: 0 },
              column: { id: columnDef.id ?? "" },
              table: {} as never,
              cell: {} as never,
              renderValue: () => value,
            };
            return flexRender(columnDef.cell, ctx as never);
          }
          return value == null ? "—" : String(value);
        },
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.value;
          const b = rowB.original.value;
          if (a == null && b == null) return 0;
          if (a == null) return 1;
          if (b == null) return -1;
          if (typeof a === "number" && typeof b === "number") return a - b;
          return String(a).localeCompare(String(b));
        },
      },
    ];

    // Add derived column if configured
    if (derivedColumn) {
      cols.push({
        id: "derived",
        accessorKey: "derived",
        header: () => (
          <div className="flex items-center gap-1.5">
            <span>{derivedColumn.header}</span>
            {derivedColumn.headerTooltip && (
              <TooltipProvider>
                <Tooltip delayDuration={200}>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Info className="h-3.5 w-3.5 cursor-help shrink-0 text-slate-300 hover:text-slate-500 transition-colors" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-sm">
                    {derivedColumn.headerTooltip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        ),
        enableSorting: true,
        cell: ({ row }) => derivedColumn.render(row.original.derived),
        sortingFn: (rowA, rowB) => {
          const a = rowA.original.derived;
          const b = rowB.original.derived;
          if (a == null && b == null) return 0;
          if (a == null) return 1;
          if (b == null) return -1;
          if (typeof a === "number" && typeof b === "number") return a - b;
          return String(a).localeCompare(String(b));
        },
      });
    }

    return cols;
  }, [transposed, derivedColumn]);

  // Determine effective data and columns based on mode
  const effectiveData = transposed
    ? (transposedRows as unknown as TData[])
    : data;
  const effectiveColumns = transposed
    ? (transposedTableColumns as unknown as ColumnDef<TData, TValue>[])
    : columns;

  // ============================================================================
  // Table Instance
  // ============================================================================

  // Higher default page size for transposed tables (50 vs 10)
  const effectivePageSize = transposed
    ? Math.max(defaultPageSize, 50)
    : defaultPageSize;

  const table = useReactTable({
    data: effectiveData,
    columns: effectiveColumns,
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
      pagination: { pageSize: effectivePageSize },
    },
  });

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleSearch = (value: string) => {
    if (transposed) {
      // In transposed mode, search the label column
      table.getColumn("label")?.setFilterValue(value);
    } else if (searchColumn) {
      table.getColumn(searchColumn)?.setFilterValue(value);
    } else {
      setGlobalFilter(value);
    }
  };

  const searchValue = transposed
    ? ((table.getColumn("label")?.getFilterValue() as string) ?? "")
    : searchColumn
      ? ((table.getColumn(searchColumn)?.getFilterValue() as string) ?? "")
      : globalFilter;

  const handleExport = () => {
    if (onExport) {
      onExport();
      return;
    }

    const exportColumns = effectiveColumns.filter(
      (col) => col.id !== "actions",
    );
    const headers = exportColumns.map((col) => {
      if (typeof col.header === "string") return col.header;
      if ("accessorKey" in col) return String(col.accessorKey);
      return col.id ?? "";
    });

    const rows = table.getFilteredRowModel().rows.map((row) =>
      exportColumns
        .map((col) => {
          const value = row.getValue(
            col.id ?? ("accessorKey" in col ? String(col.accessorKey) : ""),
          );
          return `"${String(value ?? "").replace(/"/g, '""')}"`;
        })
        .join(","),
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

  const hasFilters =
    filterChips.length > 0 || Object.values(filterValues).some((v) => v);

  // Visualization data for transposed mode
  const filteredRows = table.getFilteredRowModel().rows;
  const visualizationData = React.useMemo(() => {
    if (!transposed) {
      return filteredRows.map((r) => r.original);
    }
    return filteredRows.map((row) => {
      const original = row.original as unknown as TransposedRow;
      return {
        id: original.id,
        label: original.label,
        value: original.value,
        derived: original.derived,
      };
    });
  }, [transposed, filteredRows]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden",
        className,
      )}
    >
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
      {dimensions && dimensions.length > 0 && (
        <ScopeBar dimensions={dimensions} />
      )}

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
        <LoadingState columns={effectiveColumns.length} />
      ) : viewMode === "chart" && Visualization ? (
        <div className="p-6">
          {transposed
            ? React.createElement(
                Visualization as React.ComponentType<VisualizationProps>,
                {
                  data: visualizationData as VisualizationProps["data"],
                  derivedColumn,
                },
              )
            : React.createElement(
                Visualization as React.ComponentType<{ data: TData[] }>,
                {
                  data: visualizationData as TData[],
                },
              )}
        </div>
      ) : (
        <TableContent
          table={table}
          rows={table.getRowModel().rows}
          sorting={sorting}
          onRowClick={onRowClick}
          emptyMessage={emptyMessage}
          loading={false}
        />
      )}

      {/* Footer - hidden in chart view or when all rows fit on one page */}
      {!error &&
        !loading &&
        viewMode !== "chart" &&
        table.getRowModel().rows.length > 0 &&
        table.getFilteredRowModel().rows.length >
          table.getState().pagination.pageSize && (
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
