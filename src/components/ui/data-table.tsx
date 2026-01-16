"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
  type VisibilityState,
  type Row,
} from "@tanstack/react-table";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Download,
  Filter,
  MoreHorizontal,
  Table as TableIcon,
  BarChart3,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "./card";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

// ============================================================================
// Types
// ============================================================================

export interface DataTableTab {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface DataTableProps<TData, TValue> {
  /** Table columns definition */
  columns: ColumnDef<TData, TValue>[];
  /** Table data */
  data: TData[];
  /** Title displayed in header */
  title?: string;
  /** Subtitle/description */
  subtitle?: string;
  /** Search placeholder text */
  searchPlaceholder?: string;
  /** Column to search on (defaults to global filter) */
  searchColumn?: string;
  /** Enable search */
  searchable?: boolean;
  /** Enable export */
  exportable?: boolean;
  /** Export filename */
  exportFilename?: string;
  /** Enable filters button */
  filterable?: boolean;
  /** Tabs for switching views */
  tabs?: DataTableTab[];
  /** Active tab */
  activeTab?: string;
  /** Tab change handler */
  onTabChange?: (tabId: string) => void;
  /** Custom filter panel */
  filterPanel?: React.ReactNode;
  /** Show filters panel */
  showFilters?: boolean;
  /** Toggle filters handler */
  onToggleFilters?: () => void;
  /** Page size options */
  pageSizeOptions?: number[];
  /** Default page size */
  defaultPageSize?: number;
  /** Row click handler */
  onRowClick?: (row: Row<TData>) => void;
  /** Custom row actions */
  rowActions?: (row: Row<TData>) => React.ReactNode;
  /** Empty state message */
  emptyMessage?: string;
  /** Loading state */
  loading?: boolean;
  /** Additional class name */
  className?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

function SortIcon({ direction }: { direction: "asc" | "desc" | false }) {
  if (direction === "asc") return <ArrowUp className="h-3.5 w-3.5" />;
  if (direction === "desc") return <ArrowDown className="h-3.5 w-3.5" />;
  return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
}

function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 50, 100],
}: {
  table: ReturnType<typeof useReactTable<TData>>;
  pageSizeOptions?: number[];
}) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const startRow = pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    const maxVisible = 5;

    if (pageCount <= maxVisible) {
      for (let i = 0; i < pageCount; i++) pages.push(i);
    } else {
      // Always show first page
      pages.push(0);

      if (pageIndex > 2) pages.push("ellipsis");

      // Show pages around current
      const start = Math.max(1, pageIndex - 1);
      const end = Math.min(pageCount - 2, pageIndex + 1);

      for (let i = start; i <= end; i++) pages.push(i);

      if (pageIndex < pageCount - 3) pages.push("ellipsis");

      // Always show last page
      if (pageCount > 1) pages.push(pageCount - 1);
    }

    return pages;
  };

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200">
      <div className="text-sm text-slate-500">
        Showing <span className="font-semibold text-slate-700">{startRow}</span> to{" "}
        <span className="font-semibold text-slate-700">{endRow}</span> of{" "}
        <span className="font-semibold text-slate-700">{totalRows}</span> results
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {getPageNumbers().map((page, idx) =>
          page === "ellipsis" ? (
            <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">
              ...
            </span>
          ) : (
            <button
              key={page}
              onClick={() => table.setPageIndex(page)}
              className={cn(
                "h-9 w-9 rounded-lg text-sm font-medium transition-all duration-200",
                pageIndex === page
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {page + 1}
            </button>
          )
        )}

        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DataTable<TData, TValue>({
  columns,
  data,
  title,
  subtitle,
  searchPlaceholder = "Search...",
  searchColumn,
  searchable = true,
  exportable = true,
  exportFilename = "data-export",
  filterable = false,
  tabs,
  activeTab,
  onTabChange,
  filterPanel,
  showFilters,
  onToggleFilters,
  pageSizeOptions = [10, 20, 50, 100],
  defaultPageSize = 10,
  onRowClick,
  rowActions,
  emptyMessage = "No results found",
  loading = false,
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  // Add row actions column if provided
  const columnsWithActions = React.useMemo(() => {
    if (!rowActions) return columns;

    return [
      ...columns,
      {
        id: "actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {rowActions(row)}
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      } as ColumnDef<TData, TValue>,
    ];
  }, [columns, rowActions]);

  const table = useReactTable({
    data,
    columns: columnsWithActions,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: defaultPageSize },
    },
  });

  // Export to CSV
  const handleExport = () => {
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
          const cellValue = row.getValue(col.id ?? ("accessorKey" in col ? String(col.accessorKey) : ""));
          return `"${String(cellValue ?? "").replace(/"/g, '""')}"`;
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

  const filteredCount = table.getFilteredRowModel().rows.length;
  const totalCount = data.length;

  return (
    <Card className={className}>
      <CardContent className="!p-0">
        {/* Header */}
        {(title || subtitle || filterable || exportable) && (
          <div className="px-6 py-5 border-b border-slate-200">
            <div className="flex items-start justify-between">
              <div>
                {title && (
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="mt-1 text-base text-slate-500">{subtitle}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {filterable && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onToggleFilters}
                    className={cn(
                      "rounded-xl border-slate-200",
                      showFilters && "bg-slate-100"
                    )}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                )}
                {exportable && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleExport}
                    className="rounded-xl bg-slate-900 hover:bg-slate-800"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        {tabs && tabs.length > 0 && (
          <div className="px-6 py-3 border-b border-slate-200">
            <div className="flex items-center gap-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange?.(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-base font-semibold rounded-xl transition-all duration-200",
                      activeTab === tab.id
                        ? "bg-slate-900 text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter Panel */}
        {showFilters && filterPanel && (
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50">
            {filterPanel}
          </div>
        )}

        {/* Search & Count */}
        {searchable && (
          <div className="px-6 py-3 border-b border-slate-200">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchColumn ? (table.getColumn(searchColumn)?.getFilterValue() as string) ?? "" : globalFilter}
                  onChange={(e) =>
                    searchColumn
                      ? table.getColumn(searchColumn)?.setFilterValue(e.target.value)
                      : setGlobalFilter(e.target.value)
                  }
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 focus:border-slate-300 transition-all"
                />
              </div>

              <div className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-700">{filteredCount}</span>{" "}
                of <span className="font-semibold text-slate-700">{totalCount}</span>{" "}
                {totalCount === 1 ? "result" : "results"}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/50 border-b border-slate-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();

                    return (
                      <th
                        key={header.id}
                        className="px-6 py-3 text-left text-sm font-bold uppercase tracking-widest text-slate-400"
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            onClick={header.column.getToggleSortingHandler()}
                            className="flex items-center gap-1.5 hover:text-slate-600 transition-colors"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <SortIcon direction={sorted} />
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={columnsWithActions.length} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-8 w-8 border-2 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
                      <span className="text-sm text-slate-500">Loading data...</span>
                    </div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={columnsWithActions.length} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <TableIcon className="h-10 w-10 text-slate-300" />
                      <span className="text-sm text-slate-500">{emptyMessage}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => onRowClick?.(row)}
                    className={cn(
                      "hover:bg-slate-50/50 transition-colors",
                      onRowClick && "cursor-pointer"
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-4 text-base">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {table.getPageCount() > 1 && (
          <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Helper Components for Custom Cells
// ============================================================================

/** Badge cell for categorical data (e.g., variant consequences, clinical significance) */
export function DataTableBadge({
  children,
  variant = "default",
  className,
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info" | "purple";
  className?: string;
}) {
  const variants = {
    default: "bg-slate-100 text-slate-700 border-slate-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    error: "bg-red-50 text-red-700 border-red-200",
    info: "bg-blue-50 text-blue-700 border-blue-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-md text-[13px] font-medium border",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Score cell with color bar indicator (e.g., CADD score) */
export function DataTableScore({
  value,
  max = 100,
  thresholds = { low: 10, medium: 20, high: 30 },
  showBar = true,
  precision = 2,
}: {
  value: number | null | undefined;
  max?: number;
  thresholds?: { low: number; medium: number; high: number };
  showBar?: boolean;
  precision?: number;
}) {
  if (value == null) {
    return <span className="text-slate-400">—</span>;
  }

  const percentage = Math.min((value / max) * 100, 100);
  const color =
    value >= thresholds.high
      ? "bg-red-500"
      : value >= thresholds.medium
      ? "bg-amber-500"
      : value >= thresholds.low
      ? "bg-emerald-500"
      : "bg-slate-300";

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[15px] font-semibold text-slate-900 tabular-nums">
        {value.toFixed(precision)}
      </span>
      {showBar && (
        <div className="h-1 w-16 bg-slate-200 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full", color)} style={{ width: `${percentage}%` }} />
        </div>
      )}
    </div>
  );
}

/** Progress bar cell (e.g., allele frequency, percentages) */
export function DataTableProgress({
  value,
  max = 1,
  color = "blue",
  showValue = true,
  format = "percent",
}: {
  value: number | null | undefined;
  max?: number;
  color?: "blue" | "green" | "red" | "amber" | "purple" | "slate";
  showValue?: boolean;
  format?: "percent" | "decimal" | "scientific";
}) {
  if (value == null) {
    return <span className="text-slate-400">—</span>;
  }

  const percentage = Math.min((value / max) * 100, 100);
  const colors = {
    blue: "bg-blue-500",
    green: "bg-emerald-500",
    red: "bg-red-500",
    amber: "bg-amber-500",
    purple: "bg-purple-500",
    slate: "bg-slate-500",
  };

  const formatValue = () => {
    switch (format) {
      case "percent":
        return `${(value * 100).toFixed(2)}%`;
      case "scientific":
        return value.toExponential(2);
      default:
        return value.toFixed(4);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {showValue && (
        <span className="text-[15px] font-mono text-slate-500 tabular-nums min-w-[70px]">
          {formatValue()}
        </span>
      )}
      <div className="h-2 w-20 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", colors[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/** Mono text cell for IDs, coordinates, variant IDs */
export function DataTableMono({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono text-[15px]",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Sparkline mini chart for inline data visualization */
export function DataTableSparkline({
  data,
  color = "blue",
  height = 24,
  width = 60,
}: {
  data: number[];
  color?: "blue" | "green" | "red" | "amber" | "purple";
  height?: number;
  width?: number;
}) {
  if (!data || data.length === 0) {
    return <span className="text-slate-400">—</span>;
  }

  const colors = {
    blue: "stroke-blue-500",
    green: "stroke-emerald-500",
    red: "stroke-red-500",
    amber: "stroke-amber-500",
    purple: "stroke-purple-500",
  };

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        className={cn("stroke-[1.5]", colors[color])}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Link cell with external icon */
export function DataTableLink({
  href,
  children,
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className="text-base font-medium text-purple-600 hover:text-purple-700 hover:underline transition-colors inline-flex items-center gap-1"
    >
      {children}
      {external && (
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      )}
    </a>
  );
}

/** Multi-value cell for displaying arrays */
export function DataTableMultiValue({
  values,
  max = 3,
}: {
  values: string[] | null | undefined;
  max?: number;
}) {
  if (!values || values.length === 0) {
    return <span className="text-slate-400">—</span>;
  }

  const displayed = values.slice(0, max);
  const remaining = values.length - max;

  return (
    <div className="flex flex-wrap gap-1">
      {displayed.map((val, i) => (
        <span
          key={i}
          className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[13px]"
        >
          {val}
        </span>
      ))}
      {remaining > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-50 text-slate-400 text-[13px]">
          +{remaining} more
        </span>
      )}
    </div>
  );
}

/** Header with tooltip for column descriptions */
export function DataTableHeader({
  children,
  tooltip,
}: {
  children: React.ReactNode;
  tooltip?: React.ReactNode;
}) {
  if (!tooltip) return <>{children}</>;

  return (
    <div className="flex items-center gap-1.5">
      {children}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-slate-400 hover:text-slate-600 cursor-help transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
          </TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

/** Boolean/Status cell */
export function DataTableStatus({
  value,
  trueLabel = "Yes",
  falseLabel = "No",
}: {
  value: boolean | null | undefined;
  trueLabel?: string;
  falseLabel?: string;
}) {
  if (value == null) {
    return <span className="text-slate-400">—</span>;
  }

  return value ? (
    <span className="inline-flex items-center gap-1.5 text-base text-emerald-600">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      {trueLabel}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-base text-slate-400">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
      {falseLabel}
    </span>
  );
}

/** Gene symbol cell with link */
export function DataTableGene({
  symbol,
  href,
}: {
  symbol: string;
  href?: string;
}) {
  const content = (
    <span className="text-base font-semibold text-slate-900">{symbol}</span>
  );

  if (href) {
    return (
      <a
        href={href}
        className="hover:text-purple-600 transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  }

  return content;
}

export default DataTable;
