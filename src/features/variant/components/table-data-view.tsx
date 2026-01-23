"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Download,
  Info,
  Search,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@shared/components/ui/card";
import { NoDataState } from "@shared/components/ui/error-states";
import { Input } from "@shared/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shared/components/ui/tooltip";
import type { ColumnMeta } from "@infra/table/column-builder";

// ============================================================================
// Types
// ============================================================================

interface TableDataViewProps<T> {
  /** Data rows to display */
  data: T[];
  /** TanStack Table column definitions */
  columns: ColumnDef<T, any>[];
  /** Title displayed in card header */
  title: string;
  /** Description displayed below title */
  description?: string;
  /** Message shown when data is empty */
  emptyMessage?: string;
  /** Placeholder for search input */
  searchPlaceholder?: string;
  /** Label for item count (e.g., "transcript" -> "5 transcripts") */
  itemLabel?: string;
  /** Default sort configuration */
  defaultSort?: { id: string; desc: boolean };
  /** Enable/disable search (default: true) */
  showSearch?: boolean;
  /** Enable/disable export (default: true) */
  showExport?: boolean;
  /** Filename for CSV export */
  exportFilename?: string;
  /** Headers for CSV export */
  exportHeaders?: string[];
  /** Function to extract row data for CSV export */
  exportRow?: (row: T) => (string | number | boolean | null | undefined)[];
  /** Additional class name */
  className?: string;
}

// ============================================================================
// Sub-components
// ============================================================================

function SortIcon({ direction }: { direction: "asc" | "desc" | false }) {
  if (direction === "asc") return <ArrowUp className="h-3.5 w-3.5" />;
  if (direction === "desc") return <ArrowDown className="h-3.5 w-3.5" />;
  return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
}

function HeaderTooltip({ content }: { content: ReactNode }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-4 w-4 cursor-help flex-shrink-0 text-muted-foreground hover:text-foreground" />
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-md">
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function TableDataView<T>({
  data,
  columns,
  title,
  description,
  emptyMessage = "No data available.",
  searchPlaceholder = "Search...",
  itemLabel = "item",
  defaultSort,
  showSearch = true,
  showExport = true,
  exportFilename,
  exportHeaders,
  exportRow,
  className = "",
}: TableDataViewProps<T>) {
  // State
  const [sorting, setSorting] = useState<SortingState>(
    defaultSort ? [defaultSort] : [],
  );
  const [globalFilter, setGlobalFilter] = useState("");

  // Table instance
  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Export to CSV
  const handleExport = () => {
    if (!exportHeaders || !exportRow || !exportFilename) return;

    const csvRows = table.getFilteredRowModel().rows.map((row) =>
      exportRow(row.original)
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );

    const csv = [exportHeaders.join(","), ...csvRows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFilename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rowCount = table.getFilteredRowModel().rows.length;
  const canExport = showExport && exportHeaders && exportRow && exportFilename;

  // Empty state
  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </CardHeader>
        <CardContent>
          <NoDataState categoryName={title} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-1 text-caption rounded-full bg-muted">
              {rowCount} {rowCount === 1 ? itemLabel : `${itemLabel}s`}
            </span>
            {canExport && (
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        {showSearch && (
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10"
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="grid grid-cols-1">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const meta = header.column.columnDef.meta as
                      | ColumnMeta
                      | undefined;
                    const canSort = header.column.getCanSort();

                    return (
                      <TableHead
                        key={header.id}
                        className={
                          canSort ? "cursor-pointer hover:bg-muted/50" : ""
                        }
                        onClick={
                          canSort
                            ? header.column.getToggleSortingHandler()
                            : undefined
                        }
                      >
                        <div className="flex items-center gap-1">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {meta?.description && (
                            <HeaderTooltip content={meta.description} />
                          )}
                          {canSort && (
                            <SortIcon direction={header.column.getIsSorted()} />
                          )}
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="text-center text-muted-foreground h-24"
                  >
                    No results found for &quot;{globalFilter}&quot;
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
